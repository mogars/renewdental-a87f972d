import { Router, Request, Response } from 'express';
import { query, queryOne } from '../config/database';
import { authenticate } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.use(authenticate);

// Get chart records for a patient
router.get('/patient/:patientId', async (req: Request, res: Response) => {
  try {
    const records = await query(
      'SELECT * FROM chart_records WHERE patient_id = $1 ORDER BY record_date DESC',
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
      'SELECT * FROM chart_records WHERE id = $1',
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
    const now = new Date().toISOString();

    const record = await queryOne(
      `INSERT INTO chart_records 
       (id, patient_id, treatment_type, tooth_number, description, 
        dentist_name, cost, status, record_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [id, patient_id, treatment_type, tooth_number, description,
       dentist_name, cost, status, record_date || now, now, now]
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

    const now = new Date().toISOString();

    const record = await queryOne(
      `UPDATE chart_records SET
       treatment_type = $1, tooth_number = $2, description = $3,
       dentist_name = $4, cost = $5, status = $6, record_date = $7, updated_at = $8
       WHERE id = $9
       RETURNING *`,
      [treatment_type, tooth_number, description, dentist_name,
       cost, status, record_date, now, req.params.id]
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
    const result = await query(
      'DELETE FROM chart_records WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.length === 0) {
      res.status(404).json({ error: 'Chart record not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting chart record:', error);
    res.status(500).json({ error: 'Failed to delete chart record' });
  }
});

export default router;
