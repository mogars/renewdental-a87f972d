import { Router, Request, Response } from 'express';
import { query, queryOne } from '../config/database';
import { authenticate, requireRole } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.use(authenticate);

// Get a setting by key
router.get('/:key', async (req: Request, res: Response) => {
  try {
    const setting = await queryOne(
      'SELECT value FROM app_settings WHERE key = $1',
      [req.params.key]
    );
    res.json(setting ? [setting] : []);
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Upsert a setting (admin only)
router.post('/', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { key, value, description } = req.body;
    const now = new Date().toISOString();

    const existing = await queryOne(
      'SELECT id FROM app_settings WHERE key = $1',
      [key]
    );

    let setting;
    if (existing) {
      setting = await queryOne(
        `UPDATE app_settings SET value = $1, description = $2, updated_at = $3
         WHERE key = $4 RETURNING *`,
        [value, description, now, key]
      );
    } else {
      const id = uuidv4();
      setting = await queryOne(
        `INSERT INTO app_settings (id, key, value, description, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [id, key, value, description, now, now]
      );
    }

    res.json(setting);
  } catch (error) {
    console.error('Error saving setting:', error);
    res.status(500).json({ error: 'Failed to save setting' });
  }
});

export default router;
