import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Appointment {
  id: string;
  patient_id: string;
  title: string;
  appointment_date: string;
  start_time: string;
  patients: {
    first_name: string;
    last_name: string;
    phone: string | null;
  } | null;
}

interface ReminderConfig {
  enabled24h: boolean;
  enabled2h: boolean;
  enabled1h: boolean;
  daysBefore: number;
  template24h: string;
  template2h: string;
  template1h: string;
}

const defaultConfig: ReminderConfig = {
  enabled24h: true,
  enabled2h: true,
  enabled1h: true,
  daysBefore: 1,
  template24h: "Hi {patient_name}! This is a reminder for your dental appointment on {appointment_date} at {appointment_time}.",
  template2h: "Hi {patient_name}! Reminder: your dental appointment is in 2 hours at {appointment_time}.",
  template1h: "Hi {patient_name}! Your dental appointment is in 1 hour at {appointment_time}.",
};

function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  
  if (cleaned.startsWith("07") && cleaned.length === 10) {
    return `+4${cleaned}`;
  }
  
  if (cleaned.startsWith("007") && cleaned.length === 11) {
    return `+4${cleaned.slice(2)}`;
  }
  
  if (cleaned.startsWith("40") && cleaned.length === 11) {
    return `+${cleaned}`;
  }
  
  return `+40${cleaned}`;
}

async function sendTextBeeSMS(to: string, body: string): Promise<boolean> {
  const apiKey = Deno.env.get("TEXTBEE_API_KEY");
  const deviceId = Deno.env.get("TEXTBEE_DEVICE_ID");

  if (!apiKey || !deviceId) {
    console.error("TextBee credentials not configured - TEXTBEE_API_KEY:", !!apiKey, "TEXTBEE_DEVICE_ID:", !!deviceId);
    return false;
  }

  try {
    console.log(`Sending SMS to ${to}: ${body.substring(0, 50)}...`);
    
    const response = await fetch(
      `https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/send-sms`,
      {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipients: [to],
          message: body,
        }),
      }
    );

    const result = await response.json();
    
    if (response.ok) {
      console.log(`SMS sent successfully to ${to}:`, result);
      return true;
    } else {
      console.error(`Failed to send SMS to ${to}:`, result);
      return false;
    }
  } catch (error) {
    console.error(`Error sending SMS to ${to}:`, error);
    return false;
  }
}

function formatMessage(template: string, patientName: string, appointmentDate: string, appointmentTime: string): string {
  return template
    .replace(/{patient_name}/g, patientName)
    .replace(/{appointment_date}/g, appointmentDate)
    .replace(/{appointment_time}/g, appointmentTime);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Check for authorization header - required for manual invocations
    const authHeader = req.headers.get("Authorization");
    
    // Allow cron jobs (internal calls) without auth
    const isCronJob = req.headers.get("x-cron-job") === "true";
    
    if (!authHeader && !isCronJob) {
      // For pg_net calls, check if body has a cron indicator
      try {
        const body = await req.clone().json();
        if (!body?.cron) {
          return new Response(
            JSON.stringify({ error: "Missing authorization header" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
          );
        }
      } catch {
        return new Response(
          JSON.stringify({ error: "Missing authorization header" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }
    }

    // For manual invocations, verify the JWT token
    if (authHeader && !isCronJob) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const token = authHeader.replace("Bearer ", "");
      
      const { data, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !data.user) {
        return new Response(
          JSON.stringify({ error: "Invalid or expired token" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }

      const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
      const { data: roleData } = await serviceClient
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);

      const userRoles = roleData?.map((r) => r.role) || [];
      const hasValidRole = userRoles.some((role) => 
        ["admin", "staff", "dentist"].includes(role)
      );

      if (!hasValidRole) {
        return new Response(
          JSON.stringify({ error: "Insufficient permissions" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }
    }

    // Use service role for actual data operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch reminder configuration
    const { data: configData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "sms_reminder_config")
      .maybeSingle();

    let config: ReminderConfig = defaultConfig;
    if (configData?.value) {
      try {
        config = { ...defaultConfig, ...JSON.parse(configData.value) };
      } catch {
        console.log("Failed to parse config, using defaults");
      }
    }

    console.log("Using reminder config:", JSON.stringify(config));

    // Use Romania timezone (Europe/Bucharest) for all time calculations
    const ROMANIA_OFFSET_MS = 2 * 60 * 60 * 1000; // UTC+2 (winter time)
    const nowUTC = new Date();
    const nowRomania = new Date(nowUTC.getTime() + ROMANIA_OFFSET_MS);
    
    const today = nowRomania.toISOString().split("T")[0];
    const tomorrow = new Date(nowRomania.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    console.log(`Checking appointments for ${today} and ${tomorrow}, Romania time: ${nowRomania.toISOString()}, UTC: ${nowUTC.toISOString()}`);

    // Fetch appointments for today and tomorrow that are scheduled
    const { data: appointments, error } = await supabase
      .from("appointments")
      .select(`
        id,
        patient_id,
        title,
        appointment_date,
        start_time,
        patients (
          first_name,
          last_name,
          phone
        )
      `)
      .in("appointment_date", [today, tomorrow])
      .eq("status", "scheduled");

    if (error) {
      console.error("Error fetching appointments:", error);
      throw error;
    }

    console.log(`Found ${appointments?.length || 0} scheduled appointments`);

    const results: { success: boolean; appointmentId: string; type: string; phone?: string; error?: string }[] = [];

    for (const apt of (appointments || []) as unknown as Appointment[]) {
      if (!apt.patients?.phone) {
        console.log(`Skipping appointment ${apt.id}: No phone number`);
        continue;
      }

      // Parse appointment datetime - stored time is Romania local time
      // Convert to UTC for comparison: subtract Romania offset
      const aptDateParsed = new Date(apt.appointment_date + "T" + apt.start_time);
      const aptDateActualUTC = new Date(aptDateParsed.getTime() - ROMANIA_OFFSET_MS);
      
      // Calculate time difference from now (UTC)
      const timeDiffMs = aptDateActualUTC.getTime() - nowUTC.getTime();
      const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

      console.log(`Appointment ${apt.id}: ${apt.appointment_date} ${apt.start_time} (Romania), UTC equiv: ${aptDateActualUTC.toISOString()}, diff: ${timeDiffHours.toFixed(2)}h`);

      const patientName = apt.patients.first_name;
      const appointmentTime = apt.start_time.slice(0, 5);
      const appointmentDateStr = new Date(apt.appointment_date).toLocaleDateString("ro-RO", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });

      const normalizedPhone = normalizePhoneNumber(apt.patients.phone);

      // Send 24-hour reminder (between 22 and 26 hours before - wide window for 30-min cron)
      if (config.enabled24h && timeDiffHours >= 22 && timeDiffHours <= 26) {
        const message = formatMessage(config.template24h, patientName, appointmentDateStr, appointmentTime);
        console.log(`Sending 24h reminder for appointment ${apt.id}`);
        const success = await sendTextBeeSMS(normalizedPhone, message);
        results.push({ success, appointmentId: apt.id, type: "24h", phone: normalizedPhone });
      }

      // Send 2-hour reminder (between 1.5 and 2.5 hours before)
      if (config.enabled2h && timeDiffHours >= 1.5 && timeDiffHours <= 2.5) {
        const message = formatMessage(config.template2h, patientName, appointmentDateStr, appointmentTime);
        console.log(`Sending 2h reminder for appointment ${apt.id}`);
        const success = await sendTextBeeSMS(normalizedPhone, message);
        results.push({ success, appointmentId: apt.id, type: "2h", phone: normalizedPhone });
      }

      // Send 1-hour reminder (between 30 and 90 minutes before - wide window for 30-min cron)
      if (config.enabled1h && timeDiffHours >= 0.5 && timeDiffHours <= 1.5) {
        const message = formatMessage(config.template1h, patientName, appointmentDateStr, appointmentTime);
        console.log(`Sending 1h reminder for appointment ${apt.id}`);
        const success = await sendTextBeeSMS(normalizedPhone, message);
        results.push({ success, appointmentId: apt.id, type: "1h", phone: normalizedPhone });
      }
    }

    console.log(`Processed ${appointments?.length || 0} appointments, sent ${results.filter(r => r.success).length} reminders`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${appointments?.length || 0} appointments`,
        reminders_sent: results.filter((r) => r.success).length,
        details: results,
        config_used: {
          enabled24h: config.enabled24h,
          enabled2h: config.enabled2h,
          enabled1h: config.enabled1h,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-sms-reminder:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
