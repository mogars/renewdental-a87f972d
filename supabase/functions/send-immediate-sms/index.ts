import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

async function sendTwilioSMS(to: string, body: string): Promise<{ success: boolean; error?: string }> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    return { success: false, error: "Twilio credentials not configured" };
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
      return { success: true };
    } else {
      console.error(`Failed to send SMS to ${to}:`, result);
      return { success: false, error: result.message || "Failed to send SMS" };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error sending SMS to ${to}:`, error);
    return { success: false, error: errorMessage };
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

    // Check authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Verify JWT token
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // Verify user has valid role
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);

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

    // Get appointment ID from request body
    const { appointmentId } = await req.json();

    if (!appointmentId) {
      return new Response(
        JSON.stringify({ error: "Missing appointmentId" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Fetch the appointment with patient details
    const { data: appointment, error: aptError } = await serviceClient
      .from("appointments")
      .select(`
        id,
        title,
        appointment_date,
        start_time,
        patients (
          first_name,
          last_name,
          phone
        )
      `)
      .eq("id", appointmentId)
      .single();

    if (aptError || !appointment) {
      return new Response(
        JSON.stringify({ error: "Appointment not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Type assertion for patients - it's a single object from the join
    const patient = appointment.patients as unknown as { first_name: string; last_name: string; phone: string | null } | null;

    if (!patient?.phone) {
      return new Response(
        JSON.stringify({ error: "Patient has no phone number" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Fetch the SMS template from app_settings
    const { data: templateSetting } = await serviceClient
      .from("app_settings")
      .select("value")
      .eq("key", "sms_template")
      .maybeSingle();

    const defaultTemplate = "Hi {patient_name}! This is a reminder for your dental appointment on {appointment_date} at {appointment_time}. Please reply CONFIRM to confirm or call us to reschedule. - DentaCare";
    const template = templateSetting?.value || defaultTemplate;

    // Format the message using the template
    const appointmentTime = appointment.start_time.slice(0, 5);
    const appointmentDateStr = new Date(appointment.appointment_date).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });

    const message = template
      .replace(/{patient_name}/g, patient.first_name)
      .replace(/{appointment_date}/g, appointmentDateStr)
      .replace(/{appointment_time}/g, appointmentTime);

    // Normalize phone number to E.164 format and send the SMS
    const normalizedPhone = normalizePhoneNumber(patient.phone);
    const result = await sendTwilioSMS(normalizedPhone, message);

    if (result.success) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `SMS sent to ${patient.first_name} ${patient.last_name} at ${patient.phone}`,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    } else {
      return new Response(
        JSON.stringify({ error: result.error || "Failed to send SMS" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error("Error in send-immediate-sms:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
