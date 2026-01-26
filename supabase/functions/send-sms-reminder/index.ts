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

function normalizePhoneNumber(phone: string): string {
  // Remove any spaces, dashes, or parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, "");
  
  // If already in E.164 format, return as-is
  if (cleaned.startsWith("+")) {
    return cleaned;
  }
  
  // Romanian numbers: convert 07xx to +407xx
  if (cleaned.startsWith("07") && cleaned.length === 10) {
    return `+4${cleaned}`;
  }
  
  // Romanian numbers: convert 007xx to +407xx
  if (cleaned.startsWith("007") && cleaned.length === 11) {
    return `+4${cleaned.slice(2)}`;
  }
  
  // If starts with country code without +, add +
  if (cleaned.startsWith("40") && cleaned.length === 11) {
    return `+${cleaned}`;
  }
  
  // Default: assume it needs Romanian country code
  return `+40${cleaned}`;
}

async function sendTextBeeSMS(to: string, body: string): Promise<boolean> {
  const apiKey = Deno.env.get("TEXTBEE_API_KEY");
  const deviceId = Deno.env.get("TEXTBEE_DEVICE_ID");

  if (!apiKey || !deviceId) {
    console.error("TextBee credentials not configured");
    return false;
  }

  try {
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
    
    // If no auth header, check if this is a cron job (internal call)
    // Cron jobs from pg_cron include a specific header or come from localhost
    const isCronJob = req.headers.get("x-cron-job") === "true" || 
                      req.headers.get("host")?.includes("localhost");
    
    if (!authHeader && !isCronJob) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
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

      // Verify user has admin or staff role
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

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

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

    // Fetch the SMS template from app_settings
    const { data: templateSetting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "sms_template")
      .maybeSingle();

    const defaultTemplate = "Hi {patient_name}! This is a reminder for your dental appointment on {appointment_date} at {appointment_time}. Please reply CONFIRM to confirm or call us to reschedule. - DentaCare";
    const template = templateSetting?.value || defaultTemplate;

    const results: { success: boolean; appointmentId: string; type: string }[] = [];

    for (const apt of (appointments || []) as unknown as Appointment[]) {
      if (!apt.patients?.phone) {
        console.log(`Skipping appointment ${apt.id}: No phone number`);
        continue;
      }

      const [aptHour, aptMinute] = apt.start_time.split(":").map(Number);
      const aptDate = new Date(apt.appointment_date);
      aptDate.setUTCHours(aptHour, aptMinute, 0, 0);

      const timeDiffMs = aptDate.getTime() - now.getTime();
      const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

      const patientName = apt.patients.first_name;
      const appointmentTime = apt.start_time.slice(0, 5);
      const appointmentDateStr = new Date(apt.appointment_date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });

      // Build the message from template
      const message = template
        .replace(/{patient_name}/g, patientName)
        .replace(/{appointment_date}/g, appointmentDateStr)
        .replace(/{appointment_time}/g, appointmentTime);

      // Normalize phone number to E.164 format
      const normalizedPhone = normalizePhoneNumber(apt.patients.phone);

      // Send 24-hour reminder (between 23 and 25 hours before)
      if (timeDiffHours >= 23 && timeDiffHours <= 25) {
        const success = await sendTextBeeSMS(normalizedPhone, message);
        results.push({ success, appointmentId: apt.id, type: "24h" });
      }

      // Send 2-hour reminder (between 115 and 125 minutes before)
      if (timeDiffHours >= 1.917 && timeDiffHours <= 2.083) {
        const twoHourMessage = `Hi ${patientName}! Reminder: your dental appointment is in 2 hours at ${appointmentTime}. See you soon! - DentaCare`;
        const success = await sendTextBeeSMS(normalizedPhone, twoHourMessage);
        results.push({ success, appointmentId: apt.id, type: "2h" });
      }

      // Send 1-hour reminder (between 55 and 65 minutes before)
      if (timeDiffHours >= 0.917 && timeDiffHours <= 1.083) {
        const hourMessage = `Hi ${patientName}! Just a reminder that your dental appointment is in 1 hour at ${appointmentTime}. We look forward to seeing you! - DentaCare`;
        const success = await sendTextBeeSMS(normalizedPhone, hourMessage);
        results.push({ success, appointmentId: apt.id, type: "1h" });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${appointments?.length || 0} appointments`,
        reminders_sent: results.filter((r) => r.success).length,
        details: results,
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
