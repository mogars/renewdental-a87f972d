import { Router, Request, Response } from 'express';
import { query, queryOne } from '../config/database';
import { authenticate, requireRole } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.use(authenticate);

// Get current user's profile
router.get('/me', async (req: Request, res: Response) => {
  try {
    const profile = await queryOne(
      'SELECT * FROM profiles WHERE user_id = $1',
      [req.user!.sub]
    );

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get current user's roles
router.get('/me/roles', async (req: Request, res: Response) => {
  try {
    const roles = await query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [req.user!.sub]
    );
    res.json(roles.map(r => r.role));
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Get all profiles (admin only)
router.get('/profiles', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const profiles = await query('SELECT * FROM profiles ORDER BY email ASC');
    res.json(profiles);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

// Update profile
router.put('/profile/:userId', async (req: Request, res: Response) => {
  try {
    // Only allow updating own profile unless admin
    if (req.params.userId !== req.user!.sub && !req.user!.roles.includes('admin')) {
      res.status(403).json({ error: 'Cannot update other users profiles' });
      return;
    }

    const { display_name, phone } = req.body;
    const now = new Date().toISOString();

    const profile = await queryOne(
      `UPDATE profiles SET display_name = $1, phone = $2, updated_at = $3
       WHERE user_id = $4 RETURNING *`,
      [display_name, phone, now, req.params.userId]
    );

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    res.json(profile);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get all user roles (admin only)
router.get('/roles', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const roles = await query(
      `SELECT ur.*, p.email, p.display_name 
       FROM user_roles ur
       LEFT JOIN profiles p ON ur.user_id = p.user_id
       ORDER BY p.email ASC`
    );
    res.json(roles);
  } catch (error) {
    console.error('Error fetching user roles:', error);
    res.status(500).json({ error: 'Failed to fetch user roles' });
  }
});

// Add role to user (admin only)
router.post('/roles', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { user_id, role } = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();

    const userRole = await queryOne(
      `INSERT INTO user_roles (id, user_id, role, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, role) DO NOTHING
       RETURNING *`,
      [id, user_id, role, now]
    );

    res.status(201).json(userRole);
  } catch (error) {
    console.error('Error adding role:', error);
    res.status(500).json({ error: 'Failed to add role' });
  }
});

// Remove role from user (admin only)
router.delete('/roles/:id', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const result = await query(
      'DELETE FROM user_roles WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.length === 0) {
      res.status(404).json({ error: 'Role not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing role:', error);
    res.status(500).json({ error: 'Failed to remove role' });
  }
});

export default router;
