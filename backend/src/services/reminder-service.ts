import cron from 'node-cron';
import { query, queryOne } from '../config/database';

async function getSetting(key: string): Promise<string | null> {
    const result = await queryOne('SELECT value FROM app_settings WHERE `key` = ?', [key]);
    return result ? result.value : null;
}

async function sendSMS(to: string, body: string, apiKey: string, deviceId: string) {
    try {
        const response = await fetch(`https://api.textbee.dev/api/v1/gateway/devices/${deviceId}/send-sms`, {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                recipients: [to],
                message: body
            })
        });
        const data = await response.json();
        console.log(`[REMINDER SERVICE] SMS sent result for ${to}:`, data);
        return response.ok;
    } catch (error) {
        console.error(`[REMINDER SERVICE] SMS failed for ${to}:`, error);
        return false;
    }
}

function formatMessage(template: string, patientName: string, date: string, time: string) {
    return template
        .replace(/{patient_name}/g, patientName)
        .replace(/{appointment_date}/g, date)
        .replace(/{appointment_time}/g, time);
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function processThreshold(
    thresholdTitle: string,
    minHours: number,
    maxHours: number,
    settingKey: string,
    templateKey: string,
    sentFlag: string,
    credentials: { apiKey: string, deviceId: string }
) {
    const isEnabled = (await getSetting(settingKey)) === 'true';
    if (!isEnabled) return;

    const template = await getSetting(templateKey);
    if (!template) return;

    // Use current local time from JS to avoid DB timezone confusion
    // We add a small 2-minute "safety overlap" to catch reminders if the cron runs slightly late
    const now = new Date();

    // We search for appointments where (DATE + TIME) is between (now + min) and (now + max)
    // For 1h: between 0h and 1h2m in the future.
    const sql = `
    SELECT a.*, p.first_name, p.last_name, p.phone
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE a.${sentFlag} = 0
    AND a.status != 'cancelled'
    AND TIMESTAMP(a.appointment_date, a.start_time) >= ?
    AND TIMESTAMP(a.appointment_date, a.start_time) <= DATE_ADD(?, INTERVAL ? MINUTE)
  `;

    // Calculate window in minutes
    const maxMinutes = (maxHours * 60) + 2; // +2m grace period
    const minTime = new Date(now.getTime() + (minHours * 60 * 60 * 1000));

    const appointments = await query(sql, [minTime, now, maxMinutes]);
    if (appointments.length > 0) {
        console.log(`[REMINDER SERVICE] ${thresholdTitle} Window found ${appointments.length} appointments.`);
    }

    for (let i = 0; i < appointments.length; i++) {
        const app = appointments[i];

        if (i > 0) {
            console.log(`[REMINDER SERVICE] Rate limiting: Sleeping for 60s...`);
            await sleep(60000);
        }

        console.log(`[REMINDER SERVICE] Triggering ${thresholdTitle} for ${app.first_name} ${app.last_name} (${app.start_time})`);

        let phone = app.phone.replace(/\D/g, '');
        if (phone.startsWith('0')) phone = '+4' + phone;
        else if (!phone.startsWith('+')) phone = '+' + phone;

        const body = formatMessage(
            template,
            app.first_name,
            new Date(app.appointment_date).toLocaleDateString('ro-RO'),
            app.start_time.slice(0, 5)
        );

        const success = await sendSMS(phone, body, credentials.apiKey, credentials.deviceId);
        if (success) {
            await query(`UPDATE appointments SET ${sentFlag} = 1 WHERE id = ?`, [app.id]);
        }
    }
}

async function processReminders() {
    const now = new Date();
    const systemTime = now.toLocaleString('ro-RO');

    console.log(`[REMINDER SERVICE SCAN] System Time: ${systemTime}`);

    const apiKey = await getSetting('textbee_api_key');
    const deviceId = await getSetting('textbee_device_id');

    if (!apiKey || !deviceId) {
        console.warn('[REMINDER SERVICE] Missing Credentials - skipping run');
        return;
    }

    const creds = { apiKey, deviceId };

    // Thresholds with JS-driven absolute safety (use ranges similar to lambda implementation)
    // 1h window: ~0.917 - 1.083 hours (≈55-65 minutes)
    await processThreshold('1h Reminder', 0.917, 1.083, 'sms_enabled_1h', 'sms_template_1h', 'reminder_sent_1h', creds);
    // 2h window: ~1.917 - 2.083 hours (≈115-125 minutes)
    await processThreshold('2h Reminder', 1.917, 2.083, 'sms_enabled_2h', 'sms_template_2h', 'reminder_sent_2h', creds);
    // 24h window: ~23 - 25 hours
    await processThreshold('24h Reminder', 23, 25, 'sms_enabled_24h', 'sms_template_24h', 'reminder_sent_24h', creds);

    console.log(`[REMINDER SERVICE SCAN] Done`);
}

let isProcessing = false;
let isInitialized = false;

export const initReminderService = () => {
    isInitialized = true;
    // Run every 5 minutes to accommodate the 60s delay per message and prevent overlaps
    cron.schedule('*/5 * * * *', async () => {
        if (isProcessing) {
            console.warn('[REMINDER SERVICE] Previous run still active. Skipping...');
            return;
        }

        isProcessing = true;
        try {
            await processReminders();
        } catch (err) {
            console.error('[REMINDER SERVICE] Fatal Error:', err);
        } finally {
            isProcessing = false;
        }
    });
    console.log('✓ Automated SMS Reminder service initialized (Interval: 5m)');
};

export const getReminderServiceStatus = () => ({ initialized: isInitialized, isProcessing });
