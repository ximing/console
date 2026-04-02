import { Hocuspocus } from "@hocuspocus/server";
import { Database } from "@hocuspocus/extension-database";
import { Container } from "typedi";
import cookie from "cookie";
import jwt from "jsonwebtoken";
import type { Server } from "node:http";
import { config } from "./config/config.js";
import { UserService } from "./services/user.service.js";
import { YjsService } from "./services/yjs.service.js";
import { logger } from "./utils/logger.js";

/**
 * Initialize Hocuspocus collaboration server
 */
export const initCollab = (server: Server) => {
  const hocuspocus = new Hocuspocus({
    extensions: [
      new Database({
        // Fetch existing document state from persistence
        fetch: async ({ documentName, requestHeaders }) => {
          try {
            // Get token from cookie or Authorization header
            const cookieObj = cookie.parse(requestHeaders.cookie || "");
            let token = cookieObj.aimo_token;
            if (!token && requestHeaders.authorization) {
              token = requestHeaders.authorization.replace(/^Bearer\s+/i, "");
            }
            if (!token) {
              logger.warn("Collab fetch: no token found");
              return null;
            }

            const decoded = jwt.verify(token, config.jwt.secret) as { uid: string };
            const userService = Container.get(UserService);
            const user = await userService.getUserById(decoded.uid);
            if (!user) {
              logger.warn("Collab fetch: user not found");
              return null;
            }

            // Get YjsService to fetch persisted state
            const yjsService = Container.get(YjsService);
            const state = await yjsService.getYjsState(documentName);
            logger.info("Collab fetch:", { documentName, hasState: state !== null });
            return state;
          } catch (err) {
            logger.error("Collab fetch error:", err);
            return null;
          }
        },
        // Store document state to persistence
        store: async ({ documentName, state, requestHeaders }) => {
          try {
            const cookieObj = cookie.parse(requestHeaders.cookie || "");
            let token = cookieObj.aimo_token;
            if (!token && requestHeaders.authorization) {
              token = requestHeaders.authorization.replace(/^Bearer\s+/i, "");
            }
            if (!token) {
              logger.warn("Collab store: no token found");
              return;
            }

            const yjsService = Container.get(YjsService);
            await yjsService.saveYjsState(documentName, state);
            logger.info("Collab store:", { documentName, stateLength: state?.length });
          } catch (err) {
            logger.error("Collab store error:", err);
          }
        },
      }),
    ],
    onAuthenticate: async (data) => {
      const { request } = data;
      // Try cookie first, then Authorization header (Bearer token)
      const cookieObj = cookie.parse(request.headers.cookie || "");
      let token = cookieObj.aimo_token;
      if (!token && request.headers.authorization) {
        token = request.headers.authorization.replace(/^Bearer\s+/i, "");
      }

      if (!token) {
        throw new Error("Not authorized!");
      }

      try {
        const decoded = jwt.verify(token, config.jwt.secret) as { uid: string };
        const userService = Container.get(UserService);
        const user = await userService.getUserById(decoded.uid);
        if (!user) {
          throw new Error("User not found!");
        }
        logger.info("Collab authenticated:", { userId: user.id });
        return { user };
      } catch (err) {
        logger.error("Collab auth error:", err);
        throw new Error("Authentication failed!");
      }
    },
  });

  // Attach Hocuspocus to WebSocket endpoint via HTTP server upgrade event
  server.on("upgrade", (request: any, socket: any, head: any) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname === "/collaboration") {
      hocuspocus.handleUpgrade(request, socket, head);
    }
    // Don't destroy sockets here - let Socket.IO or other handlers process them
  });

  logger.info("Hocuspocus collaboration server initialized");
};
