import { Router, Request, Response } from 'express';
import { query, queryOne, insertAndReturn, updateAndReturn } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get a setting by key
router.get('/:key', async (req: Request, res: Response) => {
  try {
    const setting = await queryOne(
      'SELECT value FROM app_settings WHERE `key` = ?',
      [req.params.key]
    );
    res.json(setting ? [setting] : []);
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Upsert a setting
router.post('/', async (req: Request, res: Response) => {
  try {
    const { key, value, description } = req.body;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const existing = await queryOne(
      'SELECT id FROM app_settings WHERE `key` = ?',
      [key]
    );

    let setting;
    if (existing) {
      setting = await updateAndReturn(
        'app_settings',
        `UPDATE app_settings SET value = ?, description = ?, updated_at = ?
         WHERE \`key\` = ?`,
        [value, description, now, key],
        3 // key is at index 3
      );
      // Re-fetch by key since we updated by key not id
      setting = await queryOne('SELECT * FROM app_settings WHERE `key` = ?', [key]);
    } else {
      const id = uuidv4();
      setting = await insertAndReturn(
        'app_settings',
        `INSERT INTO app_settings (id, \`key\`, value, description, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
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
