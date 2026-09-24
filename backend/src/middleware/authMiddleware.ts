import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const JWT_SECRET = process.env.JWT_SECRET || 'wakeup-super-secret-jwt-key-2026';

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // Fallback to legacy x-user-id header for unauthenticated public requests or dev backward compatibility
    const fallbackUserId = req.headers['x-user-id'] as string;
    if (fallbackUserId) {
      req.user = { id: fallbackUserId, email: 'guest@wakeup.app' };
      return next();
    }
    return res.status(401).json({ error: 'Access token required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    req.user = decoded;
    next();
  } catch {
    return res.status(403).json({ error: 'Invalid or expired authentication token.' });
  }
};
