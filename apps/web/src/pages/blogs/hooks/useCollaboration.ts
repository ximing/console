import { useState, useMemo, useEffect } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { IndexeddbPersistence } from 'y-indexeddb';
import Collaboration from '@tiptap/extension-collaboration';
import { Awareness } from 'y-protocols/awareness';
import type { Extension } from '@tiptap/react';
import { inlineEditableExtensions } from '../editor/tiptap.config';
import { getUserColor } from '../editor/collaboration-provider';
import { authService } from '../../../services/auth.service';

export interface UseCollaborationOptions {
  pageId: string | undefined;
  blogUserId?: string;
}

export interface UseCollaborationReturn {
  ydoc: Y.Doc;
  provider: HocuspocusProvider | null;
  indexeddbProvider: IndexeddbPersistence | null;
  awareness: Awareness | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  editorExtensions: Extension[];
  userId: string;
  userName: string;
  userColor: string;
}

/**
 * Custom hook that encapsulates all collaboration-related logic from the blog editor page.
 *
 * Responsibilities:
 * - Y.Doc creation (useMemo)
 * - HocuspocusProvider initialization (useMemo)
 * - IndexedDB persistence initialization (useMemo)
 * - Awareness setup (useEffect)
 * - Connection status management
 * - Provider cleanup (useEffect return destroy)
 *
 * Note: 30-second snapshot timer is NOT in this hook (needs editor access which is owned by the page component).
 */
export function useCollaboration({
  pageId,
  blogUserId,
}: UseCollaborationOptions): UseCollaborationReturn {
  // Connection status state
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'disconnected' | 'connecting'
  >('disconnected');

  // Get JWT token for collaboration
  const token = authService.token || localStorage.getItem('aimo_token') || '';

  // Create Y.Doc with useMemo (stable across renders)
  const ydoc = useMemo(() => {
    return new Y.Doc();
  }, []);

  // Create HocuspocusProvider with useMemo (null if no pageId)
  const provider = useMemo(() => {
    if (!pageId) return null;
    // In dev (http), use direct WebSocket to server port 3100
    // In prod (https), use same origin with wss
    const isHttp = location.origin.includes('http://');
    const wsUrl = isHttp
      ? `ws://localhost:3100/collaboration`
      : `${location.origin.replace(/^http/, 'ws')}/collaboration`;
    const docName = `blog:${pageId}`;
    return new HocuspocusProvider({
      url: wsUrl,
      name: docName,
      document: ydoc,
      token: token,
      onAuthenticationFailed: () => {
        setConnectionStatus('disconnected');
        console.log('[Collab] Authentication failed');
      },
      onSynced() {
        setConnectionStatus('connected');
        console.log('[Collab] onSynced fired');
      },
      onDisconnect: () => {
        setConnectionStatus('disconnected');
        console.log('[Collab] Disconnected');
      },
      onConnect: () => {
        setConnectionStatus('connecting');
        console.log('[Collab] Connecting...');
      },
    });
  }, [pageId, ydoc, token]);

  // IndexedDB persistence - offline support
  const indexeddbProvider = useMemo(() => {
    if (!pageId) return null;
    return new IndexeddbPersistence(`blog-${pageId}`, ydoc);
  }, [pageId, ydoc]);

  // Get awareness from provider
  const awareness = provider?.awareness ?? null;

  // Compute user info - use blogUserId if provided, otherwise fall back to auth service user
  const userId = blogUserId || authService.user?.id || '';
  const userName = userId ? `User ${userId.slice(0, 6)}` : 'Guest';
  const userColor = getUserColor(userId);

  // Track WebSocket connection status and awareness state
  useEffect(() => {
    if (!provider) return;

    console.log('[Collab] Provider attached, listening for events');

    const handleStatus = ({ status }: { status: string }) => {
      console.log('[Collab] Status event:', status);
      setConnectionStatus(status as 'connected' | 'disconnected' | 'connecting');
    };

    const handleError = (error: unknown) => {
      console.error('[Collab] Error event:', error);
      setConnectionStatus('disconnected');
    };

    const handleSynced = () => {
      console.log('[Collab] Synced event received');
    };

    provider.on('status', handleStatus);
    provider.on('error', handleError);
    provider.on('synced', handleSynced);
    return () => {
      provider.off('status', handleStatus);
      provider.off('error', handleError);
      provider.off('synced', handleSynced);
    };
  }, [provider]);

  // Set awareness user info when awareness becomes available
  useEffect(() => {
    if (!awareness || !userId) return;

    console.log('[Collab] Setting awareness user:', { userName, userColor, userId });
    awareness.setLocalStateField('user', {
      name: userName,
      color: userColor,
      id: userId,
    });
  }, [awareness, userId, userName, userColor]);

  // Cleanup: destroy providers on unmount
  useEffect(() => {
    return () => {
      provider?.destroy();
      indexeddbProvider?.destroy();
      ydoc.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Editor extensions - build with collaboration
  const editorExtensions = useMemo(() => {
    if (!provider) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return [...(inlineEditableExtensions as any)];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseExtensions = [...(inlineEditableExtensions as any)];
    const collabExtension = Collaboration.configure({
      document: ydoc,
      provider: provider,
    });
    baseExtensions.push(collabExtension);
    return baseExtensions;
  }, [ydoc, provider]);

  return {
    ydoc,
    provider,
    indexeddbProvider,
    awareness,
    connectionStatus,
    editorExtensions,
    userId,
    userName,
    userColor,
  };
}
