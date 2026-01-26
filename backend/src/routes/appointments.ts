import { Router, Request, Response } from 'express';
import { query, queryOne } from '../config/database';
import { authenticate } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.use(authenticate);

// Get all appointments with patient info
router.get('/', async (req: Request, res: Response) => {
  try {
    const appointments = await query(
      `SELECT a.*, 
              json_build_object(
                'id', p.id,
                'first_name', p.first_name,
                'last_name', p.last_name,
                'phone', p.phone,
                'email', p.email
              ) as patients
       FROM appointments a
       LEFT JOIN patients p ON a.patient_id = p.id
       ORDER BY a.appointment_date ASC, a.start_time ASC`
    );
    res.json(appointments);
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
              json_build_object(
                'id', p.id,
                'first_name', p.first_name,
                'last_name', p.last_name,
                'phone', p.phone,
                'email', p.email
              ) as patients
       FROM appointments a
       LEFT JOIN patients p ON a.patient_id = p.id
       WHERE a.id = $1`,
      [req.params.id]
    );

    if (!appointment) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    res.json(appointment);
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
      notes,
      status = 'scheduled',
    } = req.body;

    const id = uuidv4();
    const now = new Date().toISOString();

    const appointment = await queryOne(
      `INSERT INTO appointments 
       (id, patient_id, title, appointment_date, start_time, end_time,
        treatment_type, dentist_name, doctor_id, notes, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [id, patient_id, title, appointment_date, start_time, end_time,
       treatment_type, dentist_name, doctor_id, notes, status, now, now]
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
      notes,
      status,
    } = req.body;

    const now = new Date().toISOString();

    const appointment = await queryOne(
      `UPDATE appointments SET
       patient_id = $1, title = $2, appointment_date = $3, start_time = $4,
       end_time = $5, treatment_type = $6, dentist_name = $7, doctor_id = $8,
       notes = $9, status = $10, updated_at = $11
       WHERE id = $12
       RETURNING *`,
      [patient_id, title, appointment_date, start_time, end_time,
       treatment_type, dentist_name, doctor_id, notes, status, now, req.params.id]
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
    const result = await query(
      'DELETE FROM appointments WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.length === 0) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

export default router;
