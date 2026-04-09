import { useEffect, useMemo, useRef, useState } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { IndexeddbPersistence } from 'y-indexeddb';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCaret from '@tiptap/extension-collaboration-caret';
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
  userAvatar: string | null;
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

  // Y.Doc instance - recreate when pageId changes to avoid content mixing
  const ydocRef = useRef<Y.Doc>(new Y.Doc());
  const prevPageIdRef = useRef<string | undefined>(undefined);

  // Recreate Y.Doc when pageId changes
  /* eslint-disable react-hooks/refs */
  if (prevPageIdRef.current !== pageId) {
    ydocRef.current.destroy();
    ydocRef.current = new Y.Doc();
    prevPageIdRef.current = pageId;
  }
  const ydoc = ydocRef.current;
  /* eslint-enable react-hooks/refs */

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

  // eslint-disable-next-line react-hooks/refs -- Provider is set in useEffect before this is accessed
  const awareness = providerRef.current?.awareness ?? null;
  const userId = authService.user?.id || '';
  const userName = authService.user?.username || authService.user?.email || 'Guest';
  const userColor = getUserColor(userId);
  const userAvatar = authService.user?.avatar ?? null;

  /* eslint-disable react-hooks/refs */
  useEffect(() => {
    if (!awareness || !userId) {
      return;
    }

    awareness.setLocalStateField('user', {
      id: userId,
      name: userName,
      color: userColor,
      avatar: userAvatar,
    });
  }, [awareness, userColor, userId, userName, userAvatar]);
  /* eslint-enable react-hooks/refs */

  /* eslint-disable react-hooks/refs */
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

    // Add collaboration cursor to show other users' caret positions
    baseExtensions.push(
      CollaborationCaret.configure({
        provider: providerRef.current,
        user: {
          name: userName,
          color: userColor,
          avatar: userAvatar,
        },
        render: (user) => {
          const caret = document.createElement('span');
          caret.classList.add('collaboration-carets__caret');
          caret.setAttribute('style', `border-color: ${user.color}`);

          const label = document.createElement('span');
          label.classList.add('collaboration-carets__label');
          label.setAttribute('style', `background-color: ${user.color}`);
          label.textContent = user.name;

          caret.appendChild(label);
          return caret;
        },
      })
    );

    return baseExtensions;
  }, [ydoc, providerReady, userName, userColor, userAvatar]);
  /* eslint-enable react-hooks/refs */

  /* eslint-disable react-hooks/refs */
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
    userAvatar,
  };
  /* eslint-enable react-hooks/refs */
}
