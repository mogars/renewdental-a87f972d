import { Router, Request, Response } from 'express';
import { query, queryOne, insertAndReturn, updateAndReturn } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all appointments with patient info
router.get('/', async (req: Request, res: Response) => {
  try {
    const appointments = await query(
      `SELECT a.*, 
              JSON_OBJECT(
                'id', p.id,
                'first_name', p.first_name,
                'last_name', p.last_name,
                'phone', p.phone,
                'email', p.email
              ) as patients,
              JSON_OBJECT(
                'id', o.id,
                'name', o.name
              ) as offices
       FROM appointments a
       LEFT JOIN patients p ON a.patient_id = p.id
       LEFT JOIN offices o ON a.office_id = o.id
       ORDER BY a.appointment_date ASC, a.start_time ASC`
    );

    // Parse the JSON string for patients and offices
    const parsed = appointments.map((apt: any) => ({
      ...apt,
      patients: typeof apt.patients === 'string' ? JSON.parse(apt.patients) : apt.patients,
      offices: typeof apt.offices === 'string' ? JSON.parse(apt.offices) : apt.offices
    }));

    res.json(parsed);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
});

// Get single appointment
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const appointment = await queryOne(
      `SELECT a.*, 
              JSON_OBJECT(
                'id', p.id,
                'first_name', p.first_name,
                'last_name', p.last_name,
                'phone', p.phone,
                'email', p.email
              ) as patients,
              JSON_OBJECT(
                'id', o.id,
                'name', o.name
              ) as offices
       FROM appointments a
       LEFT JOIN patients p ON a.patient_id = p.id
       LEFT JOIN offices o ON a.office_id = o.id
       WHERE a.id = ?`,
      [req.params.id]
    );

    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    // Parse the JSON string for patients and offices
    const parsed = {
      ...appointment,
      patients: typeof appointment.patients === 'string'
        ? JSON.parse(appointment.patients)
        : appointment.patients,
      offices: typeof appointment.offices === 'string'
        ? JSON.parse(appointment.offices)
        : appointment.offices
    };

    res.json(parsed);
  } catch (error) {
    console.error('Error fetching appointment:', error);
    res.status(500).json({ error: 'Failed to fetch appointment' });
  }
});

// Create appointment
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      patient_id,
      title,
      appointment_date,
      start_time,
      end_time,
      treatment_type,
      dentist_name,
      doctor_id,
      office_id,
      notes,
      status = 'scheduled',
    } = req.body;

    const id = uuidv4();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const appointment = await insertAndReturn(
      'appointments',
      `INSERT INTO appointments 
       (id, patient_id, title, appointment_date, start_time, end_time,
        treatment_type, dentist_name, doctor_id, office_id, notes, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, patient_id, title, appointment_date, start_time, end_time,
        treatment_type, dentist_name, doctor_id, office_id, notes, status, now, now]
    );

    res.status(201).json(appointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Update appointment
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const {
      patient_id,
      title,
      appointment_date,
      start_time,
      end_time,
      treatment_type,
      dentist_name,
      doctor_id,
      office_id,
      notes,
      status,
    } = req.body;

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const appointment = await updateAndReturn(
      'appointments',
      `UPDATE appointments SET
       patient_id = ?, title = ?, appointment_date = ?, start_time = ?,
       end_time = ?, treatment_type = ?, dentist_name = ?, doctor_id = ?,
       office_id = ?, notes = ?, status = ?, updated_at = ?
       WHERE id = ?`,
      [patient_id, title, appointment_date, start_time, end_time,
        treatment_type, dentist_name, doctor_id, office_id, notes, status, now, req.params.id],
      12 // id is at index 12 now
    );

    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    res.json(appointment);
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// Delete appointment
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await queryOne('SELECT id FROM appointments WHERE id = ?', [req.params.id]);

    if (!existing) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    await query('DELETE FROM appointments WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

export default router;
