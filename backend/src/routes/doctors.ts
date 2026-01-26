import { Router, Request, Response } from 'express';
import { query, queryOne } from '../config/database';
import { authenticate, requireRole } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.use(authenticate);

// Get all doctors
router.get('/', async (req: Request, res: Response) => {
  try {
    const isActiveOnly = req.query.is_active === 'true';
    const doctors = await query(
      isActiveOnly 
        ? 'SELECT * FROM doctors WHERE is_active = true ORDER BY last_name ASC'
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
      'SELECT * FROM doctors WHERE id = $1',
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

// Create doctor (admin only)
router.post('/', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { first_name, last_name, specialty, phone, email, is_active = true } = req.body;

    const id = uuidv4();
    const now = new Date().toISOString();

    const doctor = await queryOne(
      `INSERT INTO doctors 
       (id, first_name, last_name, specialty, phone, email, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [id, first_name, last_name, specialty, phone, email, is_active, now, now]
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
    const now = new Date().toISOString();

    const doctor = await queryOne(
      `UPDATE doctors SET
       first_name = $1, last_name = $2, specialty = $3, phone = $4,
       email = $5, is_active = $6, updated_at = $7
       WHERE id = $8
       RETURNING *`,
      [first_name, last_name, specialty, phone, email, is_active, now, req.params.id]
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
    const result = await query(
      'DELETE FROM doctors WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.length === 0) {
      res.status(404).json({ error: 'Doctor not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting doctor:', error);
    res.status(500).json({ error: 'Failed to delete doctor' });
  }
});

export default router;
