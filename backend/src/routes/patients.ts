import { Router, Request, Response } from 'express';
import { query, queryOne } from '../config/database';
import { authenticate } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// All routes require authentication
router.use(authenticate);

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
      'SELECT * FROM patients WHERE id = $1',
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
    const now = new Date().toISOString();

    const patient = await queryOne(
      `INSERT INTO patients 
       (id, first_name, last_name, email, phone, date_of_birth, address, 
        insurance_provider, insurance_id, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
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

    const now = new Date().toISOString();

    const patient = await queryOne(
      `UPDATE patients SET
       first_name = $1, last_name = $2, email = $3, phone = $4,
       date_of_birth = $5, address = $6, insurance_provider = $7,
       insurance_id = $8, notes = $9, updated_at = $10
       WHERE id = $11
       RETURNING *`,
      [first_name, last_name, email, phone, date_of_birth, address,
       insurance_provider, insurance_id, notes, now, req.params.id]
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
    const result = await query(
      'DELETE FROM patients WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.length === 0) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

export default router;
