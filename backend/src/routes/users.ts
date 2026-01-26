import { Router, Request, Response } from 'express';
import { query, queryOne, insertAndReturn, updateAndReturn } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get all profiles
router.get('/profiles', async (req: Request, res: Response) => {
  try {
    const profiles = await query('SELECT * FROM profiles ORDER BY email ASC');
    res.json(profiles);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

// Get profile by user_id
router.get('/:userId/profile', async (req: Request, res: Response) => {
  try {
    const profile = await queryOne(
      'SELECT * FROM profiles WHERE user_id = ?',
      [req.params.userId]
    );
    res.json(profile || null);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update profile
router.put('/:userId/profile', async (req: Request, res: Response) => {
  try {
    const { display_name, phone } = req.body;
    const { userId } = req.params;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Check if profile exists
    const existing = await queryOne('SELECT id FROM profiles WHERE user_id = ?', [userId]);

    let profile;
    if (existing) {
      profile = await updateAndReturn(
        'profiles',
        `UPDATE profiles SET display_name = ?, phone = ?, updated_at = ?
         WHERE user_id = ?`,
        [display_name, phone, now, userId],
        3 // user_id is at index 3
      );
    } else {
      // Create profile if it doesn't exist (e.g. for a new user with a role)
      // We need an email though. For now let's assume it should exist.
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    res.json(profile);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get all user roles
router.get('/roles', async (req: Request, res: Response) => {
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

// Get roles for specific user
router.get('/:userId/roles', async (req: Request, res: Response) => {
  try {
    const roles = await query(
      'SELECT * FROM user_roles WHERE user_id = ?',
      [req.params.userId]
    );
    res.json(roles);
  } catch (error) {
    console.error('Error fetching user roles:', error);
    res.status(500).json({ error: 'Failed to fetch user roles' });
  }
});

// Add role to user
router.post('/:userId/roles', async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const { userId } = req.params;
    const id = uuidv4();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Check if role already exists
    const existing = await queryOne(
      'SELECT id FROM user_roles WHERE user_id = ? AND role = ?',
      [userId, role]
    );

    if (existing) {
      res.status(200).json(existing);
      return;
    }

    const userRole = await insertAndReturn(
      'user_roles',
      `INSERT INTO user_roles (id, user_id, role, created_at)
       VALUES (?, ?, ?, ?)`,
      [id, userId, role, now]
    );

    res.status(201).json(userRole);
  } catch (error) {
    console.error('Error adding role:', error);
    res.status(500).json({ error: 'Failed to add role' });
  }
});

// Remove specific role from user
router.delete('/:userId/roles/:role', async (req: Request, res: Response) => {
  try {
    const { userId, role } = req.params;
    await query('DELETE FROM user_roles WHERE user_id = ? AND role = ?', [userId, role]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing role:', error);
    res.status(500).json({ error: 'Failed to remove role' });
  }
});

export default router;
