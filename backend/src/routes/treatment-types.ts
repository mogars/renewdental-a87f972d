import { Router, Request, Response } from 'express';
import { query, queryOne, insertAndReturn, updateAndReturn } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all treatment types
router.get('/', async (req: Request, res: Response) => {
  try {
    const isActiveOnly = req.query.is_active === 'true';
    const treatmentTypes = await query(
      isActiveOnly
        ? 'SELECT id, name, duration_minutes, is_active FROM treatment_types WHERE is_active = 1 ORDER BY name ASC'
        : 'SELECT id, name, duration_minutes, is_active FROM treatment_types ORDER BY name ASC'
    );
    res.json(treatmentTypes);
  } catch (error) {
    console.error('Error fetching treatment types:', error);
    res.status(500).json({ error: 'Failed to fetch treatment types' });
  }
});

// Create treatment type
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, duration_minutes = 60, is_active = true } = req.body;

    const id = uuidv4();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const treatmentType = await insertAndReturn(
      'treatment_types',
      `INSERT INTO treatment_types 
       (id, name, duration_minutes, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, name, duration_minutes, is_active ? 1 : 0, now, now]
    );

    res.status(201).json(treatmentType);
  } catch (error) {
    console.error('Error creating treatment type:', error);
    res.status(500).json({ error: 'Failed to create treatment type' });
  }
});

// Update treatment type
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { name, duration_minutes, is_active } = req.body;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const treatmentType = await updateAndReturn(
      'treatment_types',
      `UPDATE treatment_types SET
       name = ?, duration_minutes = ?, is_active = ?, updated_at = ?
       WHERE id = ?`,
      [name, duration_minutes, is_active ? 1 : 0, now, req.params.id],
      4 // id is at index 4
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

// Delete treatment type
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await queryOne('SELECT id FROM treatment_types WHERE id = ?', [req.params.id]);
    
    if (!existing) {
      res.status(404).json({ error: 'Treatment type not found' });
      return;
    }

    await query('DELETE FROM treatment_types WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting treatment type:', error);
    res.status(500).json({ error: 'Failed to delete treatment type' });
  }
});

export default router;
