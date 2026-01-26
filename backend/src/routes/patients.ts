import { Router, Request, Response } from 'express';
import { query, queryOne, insertAndReturn, updateAndReturn } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all patients
router.get('/', async (req: Request, res: Response) => {
  try {
    const patients = await query(
      'SELECT * FROM patients ORDER BY last_name ASC'
    );
    res.json(patients);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ error: 'Failed to fetch patients' });
  }
});

// Get single patient
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const patient = await queryOne(
      'SELECT * FROM patients WHERE id = ?',
      [req.params.id]
    );
    
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }
    
    res.json(patient);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Failed to fetch patient' });
  }
});

// Create patient
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      date_of_birth,
      address,
      insurance_provider,
      insurance_id,
      notes,
    } = req.body;

    const id = uuidv4();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const patient = await insertAndReturn(
      'patients',
      `INSERT INTO patients 
       (id, first_name, last_name, email, phone, date_of_birth, address, 
        insurance_provider, insurance_id, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, first_name, last_name, email, phone, date_of_birth, address,
       insurance_provider, insurance_id, notes, now, now]
    );

    res.status(201).json(patient);
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

// Update patient
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      date_of_birth,
      address,
      insurance_provider,
      insurance_id,
      notes,
    } = req.body;

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const patient = await updateAndReturn(
      'patients',
      `UPDATE patients SET
       first_name = ?, last_name = ?, email = ?, phone = ?,
       date_of_birth = ?, address = ?, insurance_provider = ?,
       insurance_id = ?, notes = ?, updated_at = ?
       WHERE id = ?`,
      [first_name, last_name, email, phone, date_of_birth, address,
       insurance_provider, insurance_id, notes, now, req.params.id],
      10 // id is at index 10
    );

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    res.json(patient);
  } catch (error) {
    console.error('Error updating patient:', error);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

// Delete patient
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await queryOne('SELECT id FROM patients WHERE id = ?', [req.params.id]);
    
    if (!existing) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    await query('DELETE FROM patients WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

export default router;
