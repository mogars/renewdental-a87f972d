import { Router, Request, Response } from 'express';
import { query, queryOne, insertAndReturn, updateAndReturn } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get chart records (supports ?patient_id=...)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { patient_id } = req.query;

    let sql = 'SELECT * FROM chart_records';
    let params: any[] = [];

    if (patient_id) {
      sql += ' WHERE patient_id = ?';
      params.push(patient_id);
    }

    sql += ' ORDER BY record_date DESC';

    const records = await query(sql, params);
    res.json(records);
  } catch (error) {
    console.error('Error fetching chart records:', error);
    res.status(500).json({ error: 'Failed to fetch chart records' });
  }
});

// Get chart records for a patient
router.get('/patient/:patientId', async (req: Request, res: Response) => {
  try {
    const records = await query(
      'SELECT * FROM chart_records WHERE patient_id = ? ORDER BY record_date DESC',
      [req.params.patientId]
    );
    res.json(records);
  } catch (error) {
    console.error('Error fetching chart records:', error);
    res.status(500).json({ error: 'Failed to fetch chart records' });
  }
});

// Get single chart record
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const record = await queryOne(
      'SELECT * FROM chart_records WHERE id = ?',
      [req.params.id]
    );

    if (!record) {
      res.status(404).json({ error: 'Chart record not found' });
      return;
    }

    res.json(record);
  } catch (error) {
    console.error('Error fetching chart record:', error);
    res.status(500).json({ error: 'Failed to fetch chart record' });
  }
});

// Create chart record
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      patient_id,
      treatment_type,
      tooth_number,
      description,
      dentist_name,
      cost,
      status = 'completed',
      record_date,
    } = req.body;

    const id = uuidv4();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const record = await insertAndReturn(
      'chart_records',
      `INSERT INTO chart_records 
       (id, patient_id, treatment_type, tooth_number, description, 
        dentist_name, cost, status, record_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, patient_id, treatment_type, tooth_number, description,
        dentist_name, cost, status, record_date || now.slice(0, 10), now, now]
    );

    res.status(201).json(record);
  } catch (error) {
    console.error('Error creating chart record:', error);
    res.status(500).json({ error: 'Failed to create chart record' });
  }
});

// Update chart record
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const {
      treatment_type,
      tooth_number,
      description,
      dentist_name,
      cost,
      status,
      record_date,
    } = req.body;

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const record = await updateAndReturn(
      'chart_records',
      `UPDATE chart_records SET
       treatment_type = ?, tooth_number = ?, description = ?,
       dentist_name = ?, cost = ?, status = ?, record_date = ?, updated_at = ?
       WHERE id = ?`,
      [treatment_type, tooth_number, description, dentist_name,
        cost, status, record_date, now, req.params.id],
      8 // id is at index 8
    );

    if (!record) {
      res.status(404).json({ error: 'Chart record not found' });
      return;
    }

    res.json(record);
  } catch (error) {
    console.error('Error updating chart record:', error);
    res.status(500).json({ error: 'Failed to update chart record' });
  }
});

// Delete chart record
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await queryOne('SELECT id FROM chart_records WHERE id = ?', [req.params.id]);

    if (!existing) {
      res.status(404).json({ error: 'Chart record not found' });
      return;
    }

    await query('DELETE FROM chart_records WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting chart record:', error);
    res.status(500).json({ error: 'Failed to delete chart record' });
  }
});

export default router;
