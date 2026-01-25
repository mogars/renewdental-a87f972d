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

async function sendTwilioSMS(to: string, body: string): Promise<boolean> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    console.error("Twilio credentials not configured");
    return false;
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: to,
          From: fromNumber,
          Body: body,
        }),
      }
    );

    const result = await response.json();
    
    if (response.ok) {
      console.log(`SMS sent successfully to ${to}:`, result.sid);
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
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (!roleData || !["admin", "staff", "dentist"].includes(roleData.role)) {
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

      // Send 24-hour reminder (between 23 and 25 hours before)
      if (timeDiffHours >= 23 && timeDiffHours <= 25) {
        const message = `Hi ${patientName}! This is a reminder that you have a dental appointment tomorrow, ${appointmentDateStr} at ${appointmentTime}. Please reply CONFIRM to confirm or call us to reschedule. - DentaCare`;
        
        const success = await sendTwilioSMS(apt.patients.phone, message);
        results.push({ success, appointmentId: apt.id, type: "24h" });
      }

      // Send 1-hour reminder (between 55 and 65 minutes before)
      if (timeDiffHours >= 0.917 && timeDiffHours <= 1.083) {
        const message = `Hi ${patientName}! Just a reminder that your dental appointment is in 1 hour at ${appointmentTime}. We look forward to seeing you! - DentaCare`;
        
        const success = await sendTwilioSMS(apt.patients.phone, message);
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
