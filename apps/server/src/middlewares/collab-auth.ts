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
 * Write a raw HTTP response to a Node.js socket (for WebSocket upgrade rejections).
 */
function writeHttpResponse(socket: any, status: number, message: string): void {
  const body = JSON.stringify({ success: false, message });
  const response = [
    `HTTP/1.1 ${status} ${message}`,
    'Content-Type: application/json',
    `Content-Length: ${Buffer.byteLength(body)}`,
    'Connection: close',
    '',
    body,
  ].join('\r\n');
  socket.write(response);
  socket.destroy();
}

/**
 * Express middleware for y-websocket upgrade route.
 * Validates token query param and attaches user to request.
 * Handles both regular HTTP and WebSocket upgrade contexts.
 */
export function collabAuthMiddleware(req: Request, res: any, next: any): void {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get('token');
  const room = url.searchParams.get('room');

  if (!token) {
    writeHttpResponse(res, 401, 'Token required');
    return;
  }

  if (!room) {
    writeHttpResponse(res, 400, 'Room required');
    return;
  }

  const user = verifyCollabToken(token);
  if (!user) {
    writeHttpResponse(res, 401, 'Invalid token');
    return;
  }

  (req as any).collabUser = user;
  (req as any).collabRoom = room;
  next();
}
