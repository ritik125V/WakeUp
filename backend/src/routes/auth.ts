import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User.js';
import { JWT_SECRET, authenticateToken, AuthRequest } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * Signup with Email + PIN
 */
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, pin, name } = req.body;

    if (!email || !pin) {
      return res.status(400).json({ error: 'Email and Security PIN are required.' });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const pinStr = String(pin).trim();

    if (pinStr.length < 4) {
      return res.status(400).json({ error: 'Security PIN must be at least 4 characters long.' });
    }

    // Strict case-insensitive & trimmed regex lookup for existing user
    const existingUser = await UserModel.findOne({
      email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email address already exists. Please log in.' });
    }

    const salt = await bcrypt.genSalt(10);
    const pinHash = await bcrypt.hash(pinStr, salt);

    const user = await UserModel.create({
      email: cleanEmail,
      pinHash,
      name: name ? String(name).trim() : cleanEmail.split('@')[0],
      provider: 'credentials',
    });

    const token = jwt.sign({ id: user._id.toString(), email: user.email }, JWT_SECRET, {
      expiresIn: '30d',
    });

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        provider: user.provider,
      },
    });
  } catch (error: unknown) {
    console.error('Error in signup:', error);
    if (error && typeof error === 'object' && (error as any).code === 11000) {
      return res.status(400).json({ error: 'An account with this email address already exists. Please log in.' });
    }
    res.status(500).json({ error: 'Failed to create user account' });
  }
});

/**
 * Login with Email + PIN
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, pin } = req.body;

    if (!email || !pin) {
      return res.status(400).json({ error: 'Email and Security PIN are required.' });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const pinStr = String(pin).trim();

    const user = await UserModel.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or Security PIN.' });
    }

    if (!user.pinHash) {
      return res.status(400).json({ error: 'Account registered via OAuth. Please sign in with Google or GitHub.' });
    }

    const isMatch = await bcrypt.compare(pinStr, user.pinHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or Security PIN.' });
    }

    const token = jwt.sign({ id: user._id.toString(), email: user.email }, JWT_SECRET, {
      expiresIn: '30d',
    });

    res.json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        provider: user.provider,
      },
    });
  } catch (error: unknown) {
    console.error('Error in login:', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

/**
 * OAuth Sync (Disabled for now)
 */
router.post('/oauth-sync', async (_req: Request, res: Response) => {
  return res.status(400).json({ error: 'OAuth authentication is currently disabled. Please log in using Email & Security PIN.' });
});

/**
 * Get current user profile
 */
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await UserModel.findById(req.user.id).select('-pinHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

/**
 * Change / Set Security PIN for logged in user
 */
router.put('/change-pin', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { currentPin, newPin } = req.body;
    const newPinStr = String(newPin || '').trim();

    if (!newPinStr || newPinStr.length < 4) {
      return res.status(400).json({ error: 'New Security PIN must be at least 4 characters long.' });
    }

    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If user already has a PIN, verify current PIN
    if (user.pinHash) {
      const currentPinStr = String(currentPin || '').trim();
      if (!currentPinStr) {
        return res.status(400).json({ error: 'Current Security PIN is required.' });
      }
      const isMatch = await bcrypt.compare(currentPinStr, user.pinHash);
      if (!isMatch) {
        return res.status(400).json({ error: 'Current Security PIN is incorrect.' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    user.pinHash = await bcrypt.hash(newPinStr, salt);
    await user.save();

    res.json({ message: 'Security PIN updated successfully' });
  } catch (error: unknown) {
    console.error('Error changing PIN:', error);
    res.status(500).json({ error: 'Failed to update Security PIN' });
  }
});

/**
 * Update user profile details (name)
 */
router.put('/profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { name } = req.body;
    const user = await UserModel.findById(req.user.id).select('-pinHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (name !== undefined) {
      user.name = String(name).trim();
    }

    await user.save();
    res.json({ message: 'Profile updated successfully', user });
  } catch (error: unknown) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
