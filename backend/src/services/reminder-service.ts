import cron from 'node-cron';
import { query, queryOne } from '../config/database';

async function getSetting(key: string): Promise<string | null> {
    const result = await queryOne('SELECT value FROM app_settings WHERE `key` = ?', [key]);
    return result ? result.value : null;
}

async function sendSMS(to: string, body: string, apiKey: string, deviceId: string) {
    try {
        const response = await fetch('https://api.textbee.dev/api/v1/gateway/devices/send-sms', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                deviceId: deviceId,
                to: to,
                body: body
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

    // Sliding Window Logic:
    // We only find appointments that are currently in the "active slot" for this reminder.
    const sql = `
    SELECT a.*, p.first_name, p.last_name, p.phone
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE a.${sentFlag} = 0
    AND a.status != 'cancelled'
    AND TIMESTAMP(a.appointment_date, a.start_time) > DATE_ADD(NOW(), INTERVAL ? HOUR)
    AND TIMESTAMP(a.appointment_date, a.start_time) <= DATE_ADD(NOW(), INTERVAL ? HOUR)
  `;

    const appointments = await query(sql, [minHours, maxHours]);
    if (appointments.length > 0) {
        console.log(`[REMINDER SERVICE] ${thresholdTitle} Window (${minHours}h-${maxHours}h) found ${appointments.length} appointments.`);
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
    const dbTimeResult = await queryOne('SELECT NOW() as now');
    const dbTime = dbTimeResult?.now;
    const systemTime = new Date().toLocaleString('ro-RO');

    console.log(`[REMINDER SERVICE SCAN] System: ${systemTime} | DB NOW(): ${dbTime}`);

    const apiKey = await getSetting('textbee_api_key');
    const deviceId = await getSetting('textbee_device_id');

    if (!apiKey || !deviceId) {
        console.warn('[REMINDER SERVICE] Missing Credentials - skipping run');
        return;
    }

    const creds = { apiKey, deviceId };

    // Run thresholds with non-overlapping windows
    // Current Logic:
    // 1h Reminder = Now to Now+1h
    // 2h Reminder = Now+1h to Now+2h
    // 24h Reminder = Now+2h to Now+24h
    await processThreshold('1h Reminder', 0, 1, 'sms_enabled_1h', 'sms_template_1h', 'reminder_sent_1h', creds);
    await processThreshold('2h Reminder', 1, 2, 'sms_enabled_2h', 'sms_template_2h', 'reminder_sent_2h', creds);
    await processThreshold('24h Reminder', 2, 24, 'sms_enabled_24h', 'sms_template_24h', 'reminder_sent_24h', creds);

    console.log(`[REMINDER SERVICE SCAN] Done`);
}

let isProcessing = false;

export const initReminderService = () => {
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
