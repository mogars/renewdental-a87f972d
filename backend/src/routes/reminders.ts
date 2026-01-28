import { Router } from 'express';
import { query } from '../config/database';

const router = Router();

// GET /reminders/upcoming
// Returns upcoming reminder send times for scheduled appointments (next 48 hours)
router.get('/upcoming', async (req, res) => {
  try {
    const now = new Date();
    const end = new Date(now.getTime() + 48 * 60 * 60 * 1000); // next 48 hours

    // Fetch appointments in the next 2 days that are scheduled
    const rows = await query(`
      SELECT a.id, a.appointment_date, a.start_time, a.reminder_sent_24h, a.reminder_sent_2h, a.reminder_sent_1h,
             p.first_name, p.last_name, p.phone
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      WHERE a.status = 'scheduled'
      AND a.appointment_date BETWEEN ? AND ?
    `, [now.toISOString().split('T')[0], end.toISOString().split('T')[0]]);

    const upcoming = (rows || []).map((apt: any) => {
      // Build appointment DateTime in server local / DB timezone (DB session timezone set to +02:00)
      const [year, month, day] = apt.appointment_date.split('-').map(Number);
      const [hour, minute] = apt.start_time.split(':').map(Number);
      const appointmentDate = new Date(year, month - 1, day, hour, minute, 0, 0);

      const send24 = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000);
      const send2 = new Date(appointmentDate.getTime() - 2 * 60 * 60 * 1000);
      const send1 = new Date(appointmentDate.getTime() - 1 * 60 * 60 * 1000);

      const reminders: any[] = [];
      if (!apt.reminder_sent_24h) reminders.push({ type: '24h', sendAt: send24.toISOString() });
      if (!apt.reminder_sent_2h) reminders.push({ type: '2h', sendAt: send2.toISOString() });
      if (!apt.reminder_sent_1h) reminders.push({ type: '1h', sendAt: send1.toISOString() });

      return {
        appointmentId: apt.id,
        patientName: `${apt.first_name} ${apt.last_name}`,
        phone: apt.phone,
        appointmentAt: appointmentDate.toISOString(),
        reminders
      };
    }).filter((r: any) => r.reminders.length > 0);

    res.json({ success: true, now: now.toISOString(), upcoming });
  } catch (err: any) {
    console.error('Error fetching upcoming reminders:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch reminders' });
  }
});

export default router;
