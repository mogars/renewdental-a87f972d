import { query, queryOne } from './config/database';

async function diagnose() {
    console.log('--- REMINDER DIAGNOSTICS ---');

    // 1. Check columns
    try {
        const columns = await query('SHOW COLUMNS FROM appointments');
        const columnNames = columns.map((c: any) => c.Field);
        console.log('Columns in appointments:', columnNames.join(', '));

        const required = ['reminder_sent_24h', 'reminder_sent_2h', 'reminder_sent_1h'];
        const missing = required.filter(name => !columnNames.includes(name));

        if (missing.length > 0) {
            console.error('CRITICAL: Missing columns in DB:', missing);
            console.log('Please run the SQL migration I provided in the previous step!');
            return;
        }
    } catch (err) {
        console.error('Failed to check columns:', err);
    }

    // 2. Check current time
    const dbTime = await queryOne('SELECT NOW() as now, DATE_ADD(NOW(), INTERVAL 1 HOUR) as next_hour');
    console.log('Database NOW():', dbTime.now);
    console.log('Database NOW() + 1h:', dbTime.next_hour);

    // 3. Search for the 4:30 appointment
    const apps = await query(`
    SELECT id, title, appointment_date, start_time, reminder_sent_1h, status
    FROM appointments 
    WHERE appointment_date = CURDATE()
  `);

    console.log(`Found ${apps.length} appointments for today:`);
    apps.forEach((a: any) => {
        console.log(`- [${a.start_time}] ${a.title} | Status: ${a.status} | 1h Sent: ${a.reminder_sent_1h}`);
    });

    // 4. Test the window filter logic
    const match = await query(`
    SELECT id FROM appointments
    WHERE TIMESTAMP(appointment_date, start_time) > NOW()
    AND TIMESTAMP(appointment_date, start_time) <= DATE_ADD(NOW(), INTERVAL 1 HOUR)
    AND appointment_date = CURDATE()
  `);
    console.log(`Appointments currently in 1h window matching SQL:`, match.length);
}

diagnose().then(() => process.exit(0));
