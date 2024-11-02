import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

export interface CollabUser {
  id: string;
}

/**
 * Verify JWT token from WebSocket URL query parameter.
 * Returns the decoded user or null if invalid.
 */
export function verifyCollabToken(token: string): CollabUser | null {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as { id: string };
    return { id: decoded.id };
  } catch (err) {
    logger.warn('Collab auth failed: invalid token', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Express middleware for y-websocket upgrade route.
 * Validates token query param and attaches user to request.
 */
export function collabAuthMiddleware(req: Request, res: any, next: any): void {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  const room = url.searchParams.get('room');

  if (!token) {
    res.status(401).json({ success: false, message: 'Token required' });
    return;
  }

  if (!room) {
    res.status(400).json({ success: false, message: 'Room required' });
    return;
  }

  const user = verifyCollabToken(token);
  if (!user) {
    res.status(401).json({ success: false, message: 'Invalid token' });
    return;
  }

  (req as any).collabUser = user;
  (req as any).collabRoom = room;
  next();
}
