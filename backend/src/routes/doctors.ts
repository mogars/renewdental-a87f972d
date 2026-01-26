import { Router, Request, Response } from 'express';
import { query, queryOne, insertAndReturn, updateAndReturn } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all doctors
router.get('/', async (req: Request, res: Response) => {
  try {
    const isActiveOnly = req.query.is_active === 'true';
    const doctors = await query(
      isActiveOnly 
        ? 'SELECT * FROM doctors WHERE is_active = 1 ORDER BY last_name ASC'
        : 'SELECT * FROM doctors ORDER BY last_name ASC'
    );
    res.json(doctors);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

// Get single doctor
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const doctor = await queryOne(
      'SELECT * FROM doctors WHERE id = ?',
      [req.params.id]
    );

    if (!doctor) {
      res.status(404).json({ error: 'Doctor not found' });
      return;
    }

    res.json(doctor);
  } catch (error) {
    console.error('Error fetching doctor:', error);
    res.status(500).json({ error: 'Failed to fetch doctor' });
  }
});

// Create doctor
router.post('/', async (req: Request, res: Response) => {
  try {
    const { first_name, last_name, specialty, phone, email, is_active = true } = req.body;

    const id = uuidv4();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const doctor = await insertAndReturn(
      'doctors',
      `INSERT INTO doctors 
       (id, first_name, last_name, specialty, phone, email, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, first_name, last_name, specialty, phone, email, is_active ? 1 : 0, now, now]
    );

    res.status(201).json(doctor);
  } catch (error) {
    console.error('Error creating doctor:', error);
    res.status(500).json({ error: 'Failed to create doctor' });
  }
});

// Update doctor
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { first_name, last_name, specialty, phone, email, is_active } = req.body;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const doctor = await updateAndReturn(
      'doctors',
      `UPDATE doctors SET
       first_name = ?, last_name = ?, specialty = ?, phone = ?,
       email = ?, is_active = ?, updated_at = ?
       WHERE id = ?`,
      [first_name, last_name, specialty, phone, email, is_active ? 1 : 0, now, req.params.id],
      7 // id is at index 7
    );

    if (!doctor) {
      res.status(404).json({ error: 'Doctor not found' });
      return;
    }

    res.json(doctor);
  } catch (error) {
    console.error('Error updating doctor:', error);
    res.status(500).json({ error: 'Failed to update doctor' });
  }
});

// Delete doctor
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await queryOne('SELECT id FROM doctors WHERE id = ?', [req.params.id]);
    
    if (!existing) {
      res.status(404).json({ error: 'Doctor not found' });
      return;
    }

    await query('DELETE FROM doctors WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting doctor:', error);
    res.status(500).json({ error: 'Failed to delete doctor' });
  }
});

export default router;
