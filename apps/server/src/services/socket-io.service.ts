import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Service } from 'typedi';

import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

import type { UserInfoDto } from '@aimo-console/dto';

interface AuthenticatedSocket extends Socket {
  user?: UserInfoDto;
}

interface ConnectedUser {
  socketId: string;
  userId: string;
}

@Service()
export class SocketIOService {
  private io: SocketIOServer | null = null;
  private connectedUsers: Map<string, ConnectedUser> = new Map();

  /**
   * Initialize Socket.IO server attached to the Express HTTP server
   */
  initialize(httpServer: any) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: config.cors.origin,
        credentials: true,
      },
      path: '/socket.io',
    });

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        logger.warn('Socket.IO connection attempt without token');
        return next(new Error('Authentication required'));
      }

      try {
        const decoded = jwt.verify(token as string, config.jwt.secret) as {
          id: string;
          email?: string;
          username?: string;
        };

        socket.user = {
          id: decoded.id,
          email: decoded.email || '',
          username: decoded.username || '',
        };

        next();
      } catch (error) {
        logger.warn('Socket.IO authentication failed:', {
          error: error instanceof Error ? error.message : String(error),
        });
        next(new Error('Invalid token'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`Socket.IO client connected: ${socket.id}, user: ${socket.user?.id}`);

      // Store user connection
      if (socket.user) {
        this.connectedUsers.set(socket.id, {
          socketId: socket.id,
          userId: socket.user.id,
        });
      }

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info(`Socket.IO client disconnected: ${socket.id}, reason: ${reason}`);
        this.connectedUsers.delete(socket.id);
      });
    });

    logger.info('Socket.IO server initialized');
  }

  /**
   * Send notification to a specific user
   */
  sendNotificationToUser(userId: string, event: string, data: any) {
    if (!this.io) {
      logger.warn('Socket.IO not initialized');
      return;
    }

    // Find all socket connections for this user
    const userSockets = Array.from(this.connectedUsers.entries())
      .filter(([, user]) => user.userId === userId)
      .map(([socketId]) => socketId);

    if (userSockets.length === 0) {
      logger.debug(`No connected sockets found for user: ${userId}`);
      return;
    }

    // Send to all sockets belonging to this user
    for (const socketId of userSockets) {
      this.io.to(socketId).emit(event, data);
    }

    logger.info(`Sent ${event} to user ${userId} (${userSockets.length} sockets)`);
  }

  /**
   * Get list of all connected users
   */
  getConnectedUsers(): ConnectedUser[] {
    return Array.from(this.connectedUsers.values());
  }

  /**
   * Get list of connected user IDs
   */
  getConnectedUserIds(): string[] {
    const userIds = new Set<string>();
    for (const user of this.connectedUsers.values()) {
      userIds.add(user.userId);
    }
    return Array.from(userIds);
  }

  /**
   * Get socket IDs for a specific user
   */
  getUserSocketIds(userId: string): string[] {
    return Array.from(this.connectedUsers.entries())
      .filter(([, user]) => user.userId === userId)
      .map(([socketId]) => socketId);
  }

  /**
   * Check if a user is connected
   */
  isUserConnected(userId: string): boolean {
    return Array.from(this.connectedUsers.values()).some((user) => user.userId === userId);
  }

  /**
   * Get the Socket.IO instance
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }
}
