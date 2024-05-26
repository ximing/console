import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { Service } from 'typedi';
import { Container } from 'typedi';

import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';
import { RedisService } from './redis.service.js';

import type { UserInfoDto } from '@x-console/dto';

/**
 * Push event types supported by the system
 */
export enum PushEventType {
  NOTIFICATION = 'notification',
  NOTIFICATION_UPDATE = 'notification:update',
  // Future event types can be added here:
  // MEMO_SHARED = 'memo:shared',
  // MEMO_COMMENT = 'memo:comment',
  // SYSTEM_ALERT = 'system:alert',
}

/**
 * Generic push payload interface
 */
export interface PushPayload {
  type: PushEventType;
  data: unknown;
  timestamp: string;
}

interface AuthenticatedSocket extends Socket {
  user?: UserInfoDto;
  userId?: string;
}

@Service()
export class SocketIOService {
  private io: SocketIOServer | null = null;
  private redisAdapter: any = null;

  /**
   * Room prefix for user-specific rooms
   */
  static readonly USER_ROOM_PREFIX = 'user:';

  /**
   * Get the user room name for a specific user
   */
  static getUserRoom(userId: string): string {
    return `${SocketIOService.USER_ROOM_PREFIX}${userId}`;
  }

  /**
   * Initialize Socket.IO server attached to the Express HTTP server
   */
  async initialize(httpServer: any) {
    // Get allowed origins from config
    const allowedOrigins = config.cors.origin;

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST'],
      },
      path: '/socket.io',
      transports: ['websocket', 'polling'],
    });

    logger.info('Socket.IO initialized with CORS origins:', allowedOrigins);

    // Try to set up Redis adapter for scaling
    await this.setupRedisAdapter();

    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      logger.info('Socket.IO connection attempt, token present:', !!token);
      logger.info('Socket.IO handshake auth:', socket.handshake.auth);
      logger.info('Socket.IO handshake query:', socket.handshake.query);

      if (!token) {
        logger.warn('Socket.IO connection attempt without token');
        return next(new Error('Authentication required'));
      }

      try {
        logger.info('Verifying JWT token...');
        const decoded = jwt.verify(token as string, config.jwt.secret) as {
          id: string;
          email?: string;
          username?: string;
        };
        logger.info('JWT token verified successfully for user:', decoded.id);

        socket.user = {
          id: decoded.id,
          email: decoded.email || '',
          username: decoded.username || '',
        };
        socket.userId = decoded.id;

        next();
      } catch (error) {
        logger.warn('Socket.IO authentication failed:', {
          error: error instanceof Error ? error.message : String(error),
          token: token ? `${token.substring(0, 20)}...` : 'none',
        });
        next(new Error('Invalid token'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`Socket.IO client connected: ${socket.id}, user: ${socket.user?.id}`);

      // Join user-specific room for multi-tab support
      if (socket.userId) {
        const userRoom = SocketIOService.getUserRoom(socket.userId);
        socket.join(userRoom);
        logger.info(`Socket ${socket.id} joined room: ${userRoom}`);
      }

      // Handle client's explicit room join request (for reconnection scenarios)
      socket.on('join-room', (room: string) => {
        // Validate the room name matches the user's ID for security
        if (socket.userId && room === SocketIOService.getUserRoom(socket.userId)) {
          socket.join(room);
          logger.info(`Socket ${socket.id} explicitly joined room: ${room}`);
        } else {
          logger.warn(`Socket ${socket.id} attempted to join unauthorized room: ${room}`);
        }
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        logger.info(`Socket.IO client disconnected: ${socket.id}, reason: ${reason}`);
        // Note: Socket.IO automatically handles room cleanup on disconnect
      });

      // Optional: Allow clients to subscribe to specific event types
      socket.on('subscribe', (eventTypes: string[]) => {
        logger.info(`Socket ${socket.id} subscribing to events: ${eventTypes.join(', ')}`);
        // Future: allow clients to filter which event types they receive
      });

      socket.on('unsubscribe', (eventTypes: string[]) => {
        logger.info(`Socket ${socket.id} unsubscribing from events: ${eventTypes.join(', ')}`);
      });
    });

    logger.info('Socket.IO server initialized');
  }

  /**
   * Set up Redis adapter for horizontal scaling
   */
  private async setupRedisAdapter(): Promise<void> {
    const redisConfig = config.redis;

    if (!redisConfig?.enabled) {
      logger.info('Redis not enabled, Socket.IO will run in single-node mode');
      return;
    }

    try {
      const redisService = Container.get(RedisService);
      const pubClient = redisService.getPublisher();
      const subClient = redisService.getSubscriber();

      if (!pubClient || !subClient) {
        logger.warn('Redis pub/sub clients not available, running without Redis adapter');
        return;
      }

      this.redisAdapter = createAdapter(pubClient, subClient);
      this.io?.adapter(this.redisAdapter);

      logger.info('Socket.IO Redis adapter initialized for horizontal scaling');
    } catch (error) {
      logger.error('Failed to initialize Socket.IO Redis adapter:', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send a push event to a specific user using rooms
   * Supports multiple event types
   */
  sendToUser(userId: string, eventType: PushEventType, data: unknown): void {
    if (!this.io) {
      logger.warn('Socket.IO not initialized');
      return;
    }

    const userRoom = SocketIOService.getUserRoom(userId);

    // Create a generic push payload
    const payload: PushPayload = {
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
    };

    // Use Socket.IO room to send to all sockets in the user's room (multi-tab support)
    this.io.to(userRoom).emit(eventType, payload);

    logger.info(`Sent ${eventType} to user ${userId} via room ${userRoom}`);
  }

  /**
   * Send notification to a specific user (legacy method for backward compatibility)
   */
  sendNotificationToUser(userId: string, event: string, data: any) {
    if (!this.io) {
      logger.warn('Socket.IO not initialized');
      return;
    }

    const userRoom = SocketIOService.getUserRoom(userId);
    this.io.to(userRoom).emit(event, data);

    logger.info(`Sent ${event} to user ${userId} via room ${userRoom}`);
  }

  /**
   * Check if a user is connected (has any socket in their room)
   */
  isUserConnected(userId: string): boolean {
    if (!this.io) return false;

    const userRoom = SocketIOService.getUserRoom(userId);
    const room = this.io.sockets.adapter.rooms.get(userRoom);
    return room ? room.size > 0 : false;
  }

  /**
   * Get count of connected sockets for a user
   */
  getUserConnectionCount(userId: string): number {
    if (!this.io) return 0;

    const userRoom = SocketIOService.getUserRoom(userId);
    const room = this.io.sockets.adapter.rooms.get(userRoom);
    return room ? room.size : 0;
  }

  /**
   * Get the Socket.IO instance
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Broadcast to all connected clients (admin use)
   */
  broadcast(eventType: PushEventType, data: unknown): void {
    if (!this.io) {
      logger.warn('Socket.IO not initialized');
      return;
    }

    const payload: PushPayload = {
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
    };

    this.io.emit(eventType, payload);
    logger.info(`Broadcast ${eventType} to all connected clients`);
  }
}
