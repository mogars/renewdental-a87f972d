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
    const isArray = Array.isArray(req.body);
    const settings = isArray ? req.body : [req.body];
    const results = [];

    console.log(`[DEBUG] POST /app-settings - Received ${settings.length} settings to process.`);
    if (isArray) {
      console.log(`[DEBUG] Keys received: ${settings.map((s: any) => s.key).join(', ')}`);
    }

    for (const item of settings) {
      const { key, value, description } = item;
      console.log(`[DEBUG] Step 1: Processing ${key} (Value length: ${value?.length || 0})`);
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      try {
        const existing = await queryOne(
          'SELECT id FROM app_settings WHERE `key` = ?',
          [key]
        );

        if (existing) {
          console.log(`[DEBUG] Step 2: Updating ${key}`);
          await query(
            "UPDATE app_settings SET value = ?, description = ?, updated_at = ? WHERE `key` = ?",
            [value, description || '', now, key]
          );
        } else {
          console.log(`[DEBUG] Step 2: Creating ${key}`);
          const id = uuidv4();
          await query(
            "INSERT INTO app_settings (id, `key`, value, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            [id, key, value, description || '', now, now]
          );
        }

        const verification = await queryOne('SELECT `key`, value FROM app_settings WHERE `key` = ?', [key]);
        console.log(`[DEBUG] Step 3: Verified ${key} in DB: ${verification ? 'SUCCESS' : 'FAILED'}`);
        results.push(verification);
      } catch (loopErr: any) {
        console.error(`[DEBUG] FATAL Error for key ${key}:`, loopErr.message);
        results.push({ key, error: loopErr.message });
        // Don't throw, let the loop continue
      }
    }

    console.log(`[DEBUG] Processing complete. Responding with ${results.length} results.`);
    res.json(isArray ? results : results[0]);
  } catch (error: any) {
    console.error('[DEBUG] Global Settings Handler Error:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

export default router;
