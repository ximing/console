import { useEffect, useMemo, useState } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { IndexeddbPersistence } from 'y-indexeddb';
import Collaboration from '@tiptap/extension-collaboration';
import { Awareness } from 'y-protocols/awareness';
import type { Extension } from '@tiptap/react';
import { inlineEditableExtensions } from '../editor/tiptap.config';
import { getUserColor } from '../editor/collaboration-provider';
import { authService } from '../../../../../services/auth.service';

export interface UseCollaborationOptions {
  pageId: string | undefined;
}

export interface UseCollaborationReturn {
  ydoc: Y.Doc;
  provider: HocuspocusProvider | null;
  indexeddbProvider: IndexeddbPersistence | null;
  awareness: Awareness | null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  isSynced: boolean;
  editorExtensions: Extension[];
  userId: string;
  userName: string;
  userColor: string;
}

const getCollaborationWsUrl = () => {
  const isHttp = location.origin.includes('http://');

  return isHttp
    ? 'ws://localhost:3100/collaboration'
    : `${location.origin.replace(/^http/, 'ws')}/collaboration`;
};

export function useCollaboration({ pageId }: UseCollaborationOptions): UseCollaborationReturn {
  const [connectionStatus, setConnectionStatus] = useState<
    'connected' | 'disconnected' | 'connecting'
  >('disconnected');
  const [isSynced, setIsSynced] = useState(false);

  const token = authService.token || localStorage.getItem('aimo_token') || '';

  // Each page needs an isolated Y.Doc. Reusing the same doc across pages leaks state.
  const ydoc = useMemo(() => new Y.Doc(), [pageId]);

  const provider = useMemo(() => {
    if (!pageId) {
      return null;
    }

    return new HocuspocusProvider({
      url: getCollaborationWsUrl(),
      name: `blog:${pageId}`,
      document: ydoc,
      token,
      onAuthenticationFailed: () => {
        setIsSynced(false);
        setConnectionStatus('disconnected');
        console.log('[Collab] Authentication failed');
      },
      onConnect: () => {
        setConnectionStatus('connecting');
        console.log('[Collab] Connecting...');
      },
      onDisconnect: () => {
        setIsSynced(false);
        setConnectionStatus('disconnected');
        console.log('[Collab] Disconnected');
      },
      onSynced: () => {
        setIsSynced(true);
        setConnectionStatus('connected');
        console.log('[Collab] Synced');
      },
    });
  }, [pageId, token, ydoc]);

  const indexeddbProvider = useMemo(() => {
    if (!pageId) {
      return null;
    }

    return new IndexeddbPersistence(`blog-${pageId}`, ydoc);
  }, [pageId, ydoc]);

  const awareness = provider?.awareness ?? null;
  const userId = authService.user?.id || '';
  const userName = userId ? `User ${userId.slice(0, 6)}` : 'Guest';
  const userColor = getUserColor(userId);

  useEffect(() => {
    setIsSynced(false);
    setConnectionStatus(provider ? 'connecting' : 'disconnected');
  }, [provider]);

  useEffect(() => {
    if (!provider) {
      return;
    }

    const handleStatus = ({ status }: { status: 'connected' | 'disconnected' | 'connecting' }) => {
      console.log('[Collab] Status event:', status);
      setConnectionStatus(status);
    };

    const handleError = (error: unknown) => {
      console.error('[Collab] Error event:', error);
      setIsSynced(false);
      setConnectionStatus('disconnected');
    };

    const handleSynced = () => {
      console.log('[Collab] Synced event received');
      setIsSynced(true);
      setConnectionStatus('connected');
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

  useEffect(() => {
    if (!awareness || !userId) {
      return;
    }

    awareness.setLocalStateField('user', {
      id: userId,
      name: userName,
      color: userColor,
    });
  }, [awareness, userColor, userId, userName]);

  useEffect(() => {
    return () => {
      provider?.destroy();
      indexeddbProvider?.destroy();
      ydoc.destroy();
    };
  }, [indexeddbProvider, provider, ydoc]);

  const editorExtensions = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseExtensions = [...(inlineEditableExtensions as any)];

    if (!provider) {
      return baseExtensions;
    }

    baseExtensions.push(
      Collaboration.configure({
        document: ydoc,
        provider,
      })
    );

    return baseExtensions;
  }, [provider, ydoc]);

  return {
    ydoc,
    provider,
    indexeddbProvider,
    awareness,
    connectionStatus,
    isSynced,
    editorExtensions,
    userId,
    userName,
    userColor,
  };
}
