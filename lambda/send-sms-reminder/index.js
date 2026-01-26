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
    const isCronJob = event.headers?.["x-cron-job"] === "true" || event.source === "aws.events";
    
    if (!authHeader && !isCronJob) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing authorization header" }),
      };
    }

    if (authHeader && !isCronJob) {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const token = authHeader.replace("Bearer ", "");
      
      const { data, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !data.user) {
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
        .eq("user_id", data.user.id);

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
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];

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

    const { data: templateSetting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "sms_template")
      .maybeSingle();

    const defaultTemplate = "Hi {patient_name}! This is a reminder for your dental appointment on {appointment_date} at {appointment_time}. Please reply CONFIRM to confirm or call us to reschedule. - DentaCare";
    const template = templateSetting?.value || defaultTemplate;

    const results = [];

    for (const apt of appointments || []) {
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

      const message = template
        .replace(/{patient_name}/g, patientName)
        .replace(/{appointment_date}/g, appointmentDateStr)
        .replace(/{appointment_time}/g, appointmentTime);

      const normalizedPhone = normalizePhoneNumber(apt.patients.phone);

      if (timeDiffHours >= 23 && timeDiffHours <= 25) {
        const success = await sendTextBeeSMS(normalizedPhone, message);
        results.push({ success, appointmentId: apt.id, type: "24h" });
      }

      if (timeDiffHours >= 1.917 && timeDiffHours <= 2.083) {
        const twoHourMessage = `Hi ${patientName}! Reminder: your dental appointment is in 2 hours at ${appointmentTime}. See you soon! - DentaCare`;
        const success = await sendTextBeeSMS(normalizedPhone, twoHourMessage);
        results.push({ success, appointmentId: apt.id, type: "2h" });
      }

      if (timeDiffHours >= 0.917 && timeDiffHours <= 1.083) {
        const hourMessage = `Hi ${patientName}! Just a reminder that your dental appointment is in 1 hour at ${appointmentTime}. We look forward to seeing you! - DentaCare`;
        const success = await sendTextBeeSMS(normalizedPhone, hourMessage);
        results.push({ success, appointmentId: apt.id, type: "1h" });
      }
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        success: true,
        message: `Processed ${appointments?.length || 0} appointments`,
        reminders_sent: results.filter((r) => r.success).length,
        details: results,
      }),
    };
  } catch (error) {
    console.error("Error in send-sms-reminder:", error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ error: error.message || "Unknown error" }),
    };
  }
};
