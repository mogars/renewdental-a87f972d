import { Router, Request, Response } from 'express';
import { query } from '../config/database';

const router = Router();

// Get all active offices
router.get('/', async (req: Request, res: Response) => {
    try {
        const offices = await query(
            `SELECT * FROM offices WHERE is_active = 1 ORDER BY name ASC`
        );
        res.json(offices);
    } catch (error) {
        console.error('Error fetching offices:', error);
        res.status(500).json({ error: 'Failed to fetch offices' });
    }
});

export default router;
