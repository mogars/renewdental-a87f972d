import { Router, Request, Response } from 'express';
import { queryOne } from '../config/database';

const router = Router();

function normalizePhoneNumber(phone: string) {
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

async function sendTextBeeSMS(to: string, body: string) {
    const apiKey = process.env.TEXTBEE_API_KEY;
    const deviceId = process.env.TEXTBEE_DEVICE_ID;

    if (!apiKey || !deviceId) {
        return { success: false, error: "TextBee credentials not configured in backend .env" };
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

        const result: any = await response.json();

        if (response.ok) {
            return { success: true };
        } else {
            return { success: false, error: result.message || "Failed to send SMS via TextBee" };
        }
    } catch (error: any) {
        return { success: false, error: error.message || "Unknown error calling TextBee" };
    }
}

// POST /send-sms
router.post('/', async (req: Request, res: Response) => {
    try {
        const { appointmentId } = req.body;

        if (!appointmentId) {
            res.status(400).json({ error: "Missing appointmentId" });
            return;
        }

        // 1. Fetch appointment and patient info
        const appointment = await queryOne(
            `SELECT a.*, p.first_name, p.last_name, p.phone
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       WHERE a.id = ?`,
            [appointmentId]
        );

        if (!appointment) {
            res.status(404).json({ error: "Appointment or patient not found" });
            return;
        }

        if (!appointment.phone) {
            res.status(400).json({ error: "Patient has no phone number" });
            return;
        }

        // 2. Fetch SMS template
        const templateSetting = await queryOne(
            "SELECT value FROM app_settings WHERE `key` = 'sms_template'"
        );

        const defaultTemplate = "Hi {patient_name}! This is a reminder for your dental appointment on {appointment_date} at {appointment_time}. Please call us if you need to reschedule. - Renew Dental";
        const template = templateSetting?.value || defaultTemplate;

        // 3. Format message
        const appointmentTime = appointment.start_time.slice(0, 5);
        const appointmentDateStr = new Date(appointment.appointment_date).toLocaleDateString("ro-RO", {
            weekday: "long",
            month: "long",
            day: "numeric",
        });

        const message = template
            .replace(/{patient_name}/g, appointment.first_name)
            .replace(/{appointment_date}/g, appointmentDateStr)
            .replace(/{appointment_time}/g, appointmentTime);

        // 4. Send SMS
        const normalizedPhone = normalizePhoneNumber(appointment.phone);
        const result = await sendTextBeeSMS(normalizedPhone, message);

        if (result.success) {
            res.json({
                success: true,
                message: `SMS sent to ${appointment.first_name} at ${appointment.phone}`,
            });
        } else {
            res.status(500).json({ error: result.error });
        }
    } catch (error: any) {
        console.error("Error in send-sms route:", error);
        res.status(500).json({ error: error.message || "Failed to process SMS request" });
    }
});

export default router;
