import { WebSocketServer } from 'ws';
import { Hocuspocus } from '@hocuspocus/server';
import { Database } from '@hocuspocus/extension-database';
import { Container } from 'typedi';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { config } from './config/config.js';
import { UserService } from './services/user.service.js';
import { YjsService } from './services/yjs.service.js';
import { YjsContentService } from './services/yjs-content.service.js';
import { BlogService } from './services/blog.service.js';
import { logger } from './utils/logger.js';

/**
 * Initialize Hocuspocus collaboration WebSocket handling on the main HTTP server
 * Uses path /collaboration for WebSocket upgrades
 */
export const initCollab = (server: any) => {
  const hocuspocus = new Hocuspocus({
    // Debounce 1 second for onStoreDocument
    debounce: 1000,

    async onAuthenticate({ token, request, documentName }) {
      logger.info('Collab onAuthenticate called:', { hasToken: !!token, documentName });

      // Extract token from cookie if not provided via token parameter
      let authToken: string | undefined = token || undefined;
      if (!authToken && request?.headers?.cookie) {
        const cookieObj = cookie.parse(request.headers.cookie);
        authToken = cookieObj.aimo_token;
      }

      if (!authToken) {
        logger.warn('Collab auth failed: no token');
        throw new Error('Not authorized!');
      }

      try {
        // Verify JWT token
        const decoded = jwt.verify(authToken, config.jwt.secret) as { id: string };
        logger.info('Collab token decoded:', { id: decoded.id });
        const userService = Container.get(UserService);
        const user = await userService.getUserById(decoded.id);

        if (!user) {
          logger.warn('Collab auth: user not found in DB, using token id as fallback');
          // Fallback: use the id from token directly
          return { user: { id: decoded.id, email: 'unknown', nickname: 'Guest' } };
        }

        logger.info('Collab auth success:', { userId: user.id, username: user.username });
        return { user: { id: user.id, email: user.email, nickname: user.username } };
      } catch (err) {
        logger.error('Collab auth error:', err);
        throw new Error('Authentication failed');
      }
    },

    async onConnect({ documentName, context }) {
      logger.info('Collab connected:', { documentName, context });
    },

    async onLoadDocument({ documentName, document }) {
      console.log('=== onLoadDocument called ===', { documentName, hasDocument: !!document });
      logger.info('Collab onLoadDocument:', { documentName, hasDocument: !!document });
      return document;
    },

    async onChange({ documentName, document, context }) {
      console.log('=== onChange called ===', { documentName });
      logger.info('Collab onChange:', {
        documentName,
        context,
        docType: document?.constructor?.name,
      });
      // Document changes are automatically synced by Hocuspocus via Yjs protocol
      // This callback is for custom logic (logging, webhooks, etc.)
    },

    extensions: [
      new Database({
        // Fetch existing document state from persistence
        fetch: async ({ documentName, requestHeaders }) => {
          try {
            console.log('=== Database.fetch called ===', { documentName });
            logger.info('Collab Database fetch START:', { documentName });
            const yjsService = Container.get(YjsService);
            const state = await yjsService.getYjsState(documentName);
            console.log('=== Database.fetch result ===', {
              documentName,
              hasState: state !== null,
              stateLength: state?.length,
            });
            logger.info('Collab Database fetch END:', {
              documentName,
              hasState: state !== null,
              stateLength: state?.length,
            });
            return state;
          } catch (err) {
            console.log('=== Database.fetch error ===', err);
            logger.error('Collab fetch error:', err);
            return null;
          }
        },
        // Store document state to persistence
        store: async ({ documentName, state }) => {
          try {
            console.log('=== Database.store called ===', {
              documentName,
              stateLength: state?.length,
            });
            logger.info('Collab Database store START:', {
              documentName,
              stateLength: state?.length,
            });
            const yjsService = Container.get(YjsService);
            await yjsService.saveYjsState(documentName, state);
            console.log('=== Database.store done ===', { documentName });
            logger.info('Collab Database store END:', { documentName });
          } catch (err) {
            console.log('=== Database.store error ===', err);
            logger.error('Collab store error:', err);
          }
        },
      }),
    ],

    async onStoreDocument({ documentName, document, context }) {
      logger.info('Collab onStoreDocument:', { documentName });

      try {
        // Extract blog ID from document name (format: "blog:{id}")
        const blogId = documentName.replace('blog:', '');
        if (!blogId) {
          logger.warn('Invalid document name for blog sync', { documentName });
          return;
        }

        // Convert Y.Doc to Tiptap JSON content
        const yjsContentService = Container.get(YjsContentService);
        const content = yjsContentService.extractTiptapContent(document);

        // Update blogs.content
        const blogService = Container.get(BlogService);
        await blogService.updateBlogContent(blogId, content);

        logger.info('Blog content synced from collaboration', {
          documentName,
          blogId,
        });
      } catch (err) {
        logger.error('Failed to sync blog content from collaboration', {
          documentName,
          error: err,
        });
      }
    },
  });

  // Create WebSocket server to handle upgrades
  const wss = new WebSocketServer({ noServer: true });

  // Handle upgrade requests on the main server
  server.on('upgrade', (request: any, socket: any, head: any) => {
    const pathname = new URL(request.url || '/', `http://localhost:${config.port}`).pathname;
    logger.info('Collab upgrade request:', { pathname });
    if (pathname === '/collaboration') {
      wss.handleUpgrade(request, socket, head, (ws: any) => {
        logger.info('Collab WebSocket upgrade complete, passing to Hocuspocus');
        hocuspocus.handleConnection(ws, request, {});
      });
    }
    // Don't destroy socket here - let Socket.IO handle other upgrade requests
  });

  logger.info('Hocuspocus collaboration handler initialized on main server');
};
