import { WebSocketServer } from "ws";
import { Hocuspocus } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { Container } from "typedi";
import cookie from "cookie";
import jwt from "jsonwebtoken";
import { config } from "./config/config.js";
import { UserService } from "./services/user.service.js";
import { YjsService } from "./services/yjs.service.js";
import { logger } from "./utils/logger.js";

/**
 * Initialize Hocuspocus collaboration WebSocket handling on the main HTTP server
 * Uses path /collaboration for WebSocket upgrades
 */
export const initCollab = (server: any) => {
  const hocuspocus = new Hocuspocus({
    async onAuthenticate({ token, request, documentName }) {
      logger.info("Collab onAuthenticate called:", { hasToken: !!token, documentName });

      // Extract token from cookie if not provided via token parameter
      let authToken = token;
      if (!authToken && request?.headers?.cookie) {
        const cookieObj = cookie.parse(request.headers.cookie);
        authToken = cookieObj.aimo_token;
      }

      if (!authToken) {
        logger.warn("Collab auth failed: no token");
        throw new Error("Not authorized!");
      }

      try {
        // Verify JWT token
        const decoded = jwt.verify(authToken, config.jwt.secret) as { uid: string };
        logger.info("Collab token decoded:", { uid: decoded.uid });
        const userService = Container.get(UserService);
        const user = await userService.getUserById(decoded.uid);

        if (!user) {
          logger.warn("Collab auth: user not found in DB, using token uid as fallback");
          // Fallback: use the uid from token directly
          return { user: { id: decoded.uid, email: 'unknown', nickname: 'Guest' } };
        }

        logger.info("Collab auth success:", { userId: user.uid });
        return { user: { id: user.uid, email: user.email, nickname: user.nickname } };
      } catch (err) {
        logger.error("Collab auth error:", err);
        throw new Error("Authentication failed");
      }
    },

    async onConnect({ documentName, context }) {
      logger.info("Collab connected:", { documentName, context });
    },

    async onLoadDocument({ documentName, document }) {
      logger.info("Collab onLoadDocument:", { documentName });
      // Document is already loaded by Database extension's fetch
      // Add any additional document initialization here if needed
      return document;
    },

    async onChange({ documentName, document, context }) {
      logger.info("Collab onChange:", { documentName, context });
      // Document changes are automatically synced by Hocuspocus via Yjs protocol
      // This callback is for custom logic (logging, webhooks, etc.)
    },

    extensions: [
      new Database({
        // Fetch existing document state from persistence
        fetch: async ({ documentName, requestHeaders }) => {
          try {
            logger.info("Collab Database fetch:", { documentName });
            const yjsService = Container.get(YjsService);
            const state = await yjsService.getYjsState(documentName);
            logger.info("Collab fetch result:", { documentName, hasState: state !== null });
            return state;
          } catch (err) {
            logger.error("Collab fetch error:", err);
            return null;
          }
        },
        // Store document state to persistence
        store: async ({ documentName, state }) => {
          try {
            logger.info("Collab Database store:", { documentName, stateLength: state?.length });
            const yjsService = Container.get(YjsService);
            await yjsService.saveYjsState(documentName, state);
          } catch (err) {
            logger.error("Collab store error:", err);
          }
        },
      }),
    ],
  });

  // Create WebSocket server to handle upgrades
  const wss = new WebSocketServer({ noServer: true });

  // Handle upgrade requests on the main server
  server.on("upgrade", (request: any, socket: any, head: any) => {
    const pathname = new URL(request.url || "/", `http://localhost:${config.port}`).pathname;
    logger.info("Collab upgrade request:", { pathname });
    if (pathname === "/collaboration") {
      wss.handleUpgrade(request, socket, head, (ws: any) => {
        logger.info("Collab WebSocket upgrade complete, passing to Hocuspocus");
        hocuspocus.handleConnection(ws, request, {});
      });
    }
    // Don't destroy socket here - let Socket.IO handle other upgrade requests
  });

  logger.info("Hocuspocus collaboration handler initialized on main server");
};
