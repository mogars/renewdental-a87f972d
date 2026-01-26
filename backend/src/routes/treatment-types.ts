import { Router, Request, Response } from 'express';
import { query, queryOne } from '../config/database';
import { authenticate, requireRole } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.use(authenticate);

// Get all treatment types
router.get('/', async (req: Request, res: Response) => {
  try {
    const isActiveOnly = req.query.is_active === 'true';
    const treatmentTypes = await query(
      isActiveOnly
        ? 'SELECT id, name, duration_minutes, is_active FROM treatment_types WHERE is_active = true ORDER BY name ASC'
        : 'SELECT id, name, duration_minutes, is_active FROM treatment_types ORDER BY name ASC'
    );
    res.json(treatmentTypes);
  } catch (error) {
    console.error('Error fetching treatment types:', error);
    res.status(500).json({ error: 'Failed to fetch treatment types' });
  }
});

// Create treatment type (admin only)
router.post('/', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { name, duration_minutes = 60, is_active = true } = req.body;

    const id = uuidv4();
    const now = new Date().toISOString();

    const treatmentType = await queryOne(
      `INSERT INTO treatment_types 
       (id, name, duration_minutes, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, name, duration_minutes, is_active, now, now]
    );

    res.status(201).json(treatmentType);
  } catch (error) {
    console.error('Error creating treatment type:', error);
    res.status(500).json({ error: 'Failed to create treatment type' });
  }
});

// Update treatment type (admin only)
router.put('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { name, duration_minutes, is_active } = req.body;
    const now = new Date().toISOString();

    const treatmentType = await queryOne(
      `UPDATE treatment_types SET
       name = $1, duration_minutes = $2, is_active = $3, updated_at = $4
       WHERE id = $5
       RETURNING *`,
      [name, duration_minutes, is_active, now, req.params.id]
    );

    if (!treatmentType) {
      res.status(404).json({ error: 'Treatment type not found' });
      return;
    }

    res.json(treatmentType);
  } catch (error) {
    console.error('Error updating treatment type:', error);
    res.status(500).json({ error: 'Failed to update treatment type' });
  }
});

// Delete treatment type (admin only)
router.delete('/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM treatment_types WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.length === 0) {
      res.status(404).json({ error: 'Treatment type not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting treatment type:', error);
    res.status(500).json({ error: 'Failed to delete treatment type' });
  }
});

export default router;
