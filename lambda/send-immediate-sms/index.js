const { createClient } = require("@supabase/supabase-js");

function normalizePhoneNumber(phone) {
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

async function sendTextBeeSMS(to, body) {
  const apiKey = process.env.TEXTBEE_API_KEY;
  const deviceId = process.env.TEXTBEE_DEVICE_ID;

  if (!apiKey || !deviceId) {
    return { success: false, error: "TextBee credentials not configured" };
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
      return { success: true };
    } else {
      console.error(`Failed to send SMS to ${to}:`, result);
      return { success: false, error: result.message || "Failed to send SMS" };
    }
  } catch (error) {
    console.error(`Error sending SMS to ${to}:`, error);
    return { success: false, error: error.message || "Unknown error" };
  }
}

exports.handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "" };
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing authorization header" }),
      };
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);

    if (authError || !userData.user) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Invalid or expired token" }),
      };
    }

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
      return {
        statusCode: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Insufficient permissions" }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const { appointmentId } = body;

    if (!appointmentId) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing appointmentId" }),
      };
    }

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
      return {
        statusCode: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Appointment not found" }),
      };
    }

    const patient = appointment.patients;

    if (!patient?.phone) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Patient has no phone number" }),
      };
    }

    const { data: templateSetting } = await serviceClient
      .from("app_settings")
      .select("value")
      .eq("key", "sms_template")
      .maybeSingle();

    const defaultTemplate = "Hi {patient_name}! This is a reminder for your dental appointment on {appointment_date} at {appointment_time}. Please reply CONFIRM to confirm or call us to reschedule. - DentaCare";
    const template = templateSetting?.value || defaultTemplate;

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

    const normalizedPhone = normalizePhoneNumber(patient.phone);
    const result = await sendTextBeeSMS(normalizedPhone, message);

    if (result.success) {
      return {
        statusCode: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          success: true,
          message: `SMS sent to ${patient.first_name} ${patient.last_name} at ${patient.phone}`,
        }),
      };
    } else {
      return {
        statusCode: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: result.error || "Failed to send SMS" }),
      };
    }
  } catch (error) {
    console.error("Error in send-immediate-sms:", error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Unknown error" }),
    };
  }
};
