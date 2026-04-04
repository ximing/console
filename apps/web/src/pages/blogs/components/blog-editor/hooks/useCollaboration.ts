import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [providerReady, setProviderReady] = useState(false);

  const token = authService.token || localStorage.getItem('aimo_token') || '';

  // Stable Y.Doc instance - never recreate during hook lifetime
  const ydocRef = useRef<Y.Doc | null>(null);
  if (ydocRef.current === null) {
    ydocRef.current = new Y.Doc();
  }
  const ydoc = ydocRef.current;

  const providerRef = useRef<HocuspocusProvider | null>(null);
  const indexeddbProviderRef = useRef<IndexeddbPersistence | null>(null);

  useEffect(() => {
    if (!pageId) {
      providerRef.current?.destroy();
      providerRef.current = null;
      indexeddbProviderRef.current?.destroy();
      indexeddbProviderRef.current = null;
      setIsSynced(false);
      setConnectionStatus('disconnected');
      return;
    }

    const wsUrl = getCollaborationWsUrl();
    const docName = `blog:${pageId}`;

    const provider = new HocuspocusProvider({
      url: wsUrl,
      name: docName,
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

    const indexeddbProvider = new IndexeddbPersistence(`blog-${pageId}`, ydoc);

    providerRef.current = provider;
    indexeddbProviderRef.current = indexeddbProvider;
    setProviderReady(true);

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

    setIsSynced(false);
    setConnectionStatus('connecting');

    return () => {
      provider.off('status', handleStatus);
      provider.off('error', handleError);
      provider.off('synced', handleSynced);
      provider.destroy();
      indexeddbProvider.destroy();
      providerRef.current = null;
      indexeddbProviderRef.current = null;
      setProviderReady(false);
    };
  }, [pageId, token, ydoc]);

  const awareness = providerRef.current?.awareness ?? null;
  const userId = authService.user?.id || '';
  const userName = userId ? `User ${userId.slice(0, 6)}` : 'Guest';
  const userColor = getUserColor(userId);

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
      ydoc.destroy();
    };
  }, [ydoc]);

  const editorExtensions = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseExtensions = [...(inlineEditableExtensions as any)];

    // Don't add Collaboration extension if provider is not ready
    if (!providerRef.current || !providerReady) {
      return baseExtensions;
    }

    baseExtensions.push(
      Collaboration.configure({
        document: ydoc,
        provider: providerRef.current,
      })
    );

    return baseExtensions;
  }, [ydoc, providerReady]);

  return {
    ydoc,
    provider: providerRef.current,
    indexeddbProvider: indexeddbProviderRef.current,
    awareness,
    connectionStatus,
    isSynced,
    editorExtensions,
    userId,
    userName,
    userColor,
  };
}
