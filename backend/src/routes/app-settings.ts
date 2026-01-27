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

// Upsert settings (supports single object or array)
router.post('/', async (req: Request, res: Response) => {
  try {
    const settings = Array.isArray(req.body) ? req.body : [req.body];
    const results = [];

    for (const item of settings) {
      const { key, value, description } = item;
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      const existing = await queryOne(
        'SELECT id FROM app_settings WHERE `key` = ?',
        [key]
      );

      let setting;
      if (existing) {
        console.log(`[DEBUG] Updating existing setting: ${key}`);
        await query(
          "UPDATE app_settings SET value = ?, description = ?, updated_at = ? WHERE `key` = ?",
          [value, description, now, key]
        );
        setting = await queryOne('SELECT * FROM app_settings WHERE `key` = ?', [key]);
      } else {
        console.log(`[DEBUG] Creating new setting: ${key}`);
        const id = uuidv4();
        await query(
          "INSERT INTO app_settings (id, `key`, value, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
          [id, key, value, description, now, now]
        );
        setting = await queryOne('SELECT * FROM app_settings WHERE `key` = ?', [key]);
      }
      results.push(setting);
    }

    res.json(Array.isArray(req.body) ? results : results[0]);
  } catch (error) {
    console.error('Error saving setting(s):', error);
    res.status(500).json({ error: 'Failed to save setting(s)' });
  }
});

export default router;
