import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { view, useService, raw } from '@rabjs/react';
import { useParams, useNavigate } from 'react-router';
import { useEditor, EditorContent } from '@tiptap/react';
import { Loader2, Save, Send, Eye, Edit2, Trash2 } from 'lucide-react';
import slugify from 'slugify';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { IndexeddbPersistence } from 'y-indexeddb';
import Collaboration from '@tiptap/extension-collaboration';
// CollaborationCursor is temporarily disabled due to awareness initialization timing issues
// import { CollaborationCursor } from '@tiptap/extension-collaboration-cursor';
import { BlogService } from '../../../services/blog.service';
import { DirectoryService } from '../../../services/directory.service';
import { TagService } from '../../../services/tag.service';
import { ToastService } from '../../../services/toast.service';
import { authService } from '../../../services/auth.service';
import { EditorToolbar } from './editor-toolbar';
import {
  inlineEditableExtensions,
  MAX_EXCERPT_LENGTH,
} from '../editor/tiptap.config';
import type { BlogDto } from '@x-console/dto';
import { getUserColor } from '../editor/collaboration-provider';
import { CollabAvatars } from './collab-avatars';

interface BlogEditorPageProps {
  pageId?: string;
}

// Helper functions moved outside component
const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getDirectoryPath = (
  blog: BlogDto | undefined,
  directories: { id: string; name: string }[]
): string => {
  if (!blog?.directoryId) return '';
  const dir = directories.find((d) => d.id === blog.directoryId);
  return dir?.name || '';
};

export const BlogEditorPage = view(({ pageId: pageIdProp }: BlogEditorPageProps) => {
  const params = useParams();
  const blogService = useService(BlogService);
  const directoryService = useService(DirectoryService);
  const tagService = useService(TagService);
  const toastService = useService(ToastService);
  const navigate = useNavigate();
  // Use props if provided, otherwise fall back to URL params / navigate
  const pageId = pageIdProp || params.id;

  const blog = blogService.currentBlog;

  // State
  const [isPreview, setIsPreview] = useState(true);
  const [title, setTitle] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [localSaving, setLocalSaving] = useState(false);
  const [blogLoading, setBlogLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');

  // Get JWT token for collaboration
  const token = authService.token || localStorage.getItem('aimo_token') || '';

  // Create Y.Doc with useMemo (stable across renders)
  const ydoc = useMemo(() => {
    const doc = new Y.Doc();
    console.log('[Collab] Y.Doc created');
    // Debug: observe all changes to the Y.Doc
    doc.on('update', (update: Uint8Array, origin: any) => {
      console.log('[Collab] Y.Doc update received, origin:', origin, 'update length:', update.length);
    });
    return doc;
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
    console.log('[Collab] Creating HocuspocusProvider:', { wsUrl, docName, hasToken: !!token });
    return new HocuspocusProvider({
      url: wsUrl,
      name: docName,
      document: ydoc,
      token: token,
      onAuthenticated: () => {
        console.log('[Collab] Authenticated:', docName);
      },
      onAuthenticationFailed: ({ reason }) => {
        console.error('[Collab] Auth failed:', reason);
        setConnectionStatus('disconnected');
      },
      onSynced() {
        console.log('[Collab] Synced:', docName);
        setConnectionStatus('connected');

        // 内容初始化：如果 Y.Doc 为空且有 blog 内容，写入 Y.Doc
        if (ydoc && editor && blog?.content) {
          // 检查是否已有初始内容（通过 Y.Doc 的 config map）
          if (!ydoc.getMap('config').get('initialContentLoaded')) {
            ydoc.getMap('config').set('initialContentLoaded', true);
            editor.commands.setContent(raw(blog.content));
          }
        }
      },
      onDisconnect: () => {
        console.log('[Collab] Disconnected:', docName);
        setConnectionStatus('disconnected');
      },
      onConnect: () => {
        console.log('[Collab] Connecting:', docName);
        setConnectionStatus('connecting');
      },
      onOutgoingMessage: ({ message }) => {
        console.log('[Collab] Outgoing message:', message);
      },
      onMessage: () => {
        // Debug: log incoming messages
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

  // Compute user info
  const userId = blog?.userId || '';
  const userName = userId ? `User ${userId.slice(0, 6)}` : 'Guest';
  const userColor = getUserColor(userId);

  // Track WebSocket connection status and awareness state
  useEffect(() => {
    if (!provider) return;

    const handleStatus = ({ status }: { status: string }) => {
      console.log('[Collab] Connection status:', status);
      setConnectionStatus(status as 'connected' | 'disconnected' | 'connecting');
    };

    const handleError = (error: Error) => {
      console.error('[Collab] Connection error:', error);
      setConnectionStatus('disconnected');
    };

    provider.on('status', handleStatus);
    provider.on('error', handleError);
    return () => {
      provider.off('status', handleStatus);
      provider.off('error', handleError);
    };
  }, [provider]);

  // Set awareness user info when awareness becomes available
  useEffect(() => {
    if (!awareness || !userId) return;

    // 设置本地用户信息到 awareness
    awareness.setLocalStateField('user', {
      name: userName,
      color: userColor,
      id: userId,
    });

    // 监听 awareness 变化
    const handleAwarenessChange = () => {
      console.log('[Collab] Awareness changed');
    };
    awareness.on('change', handleAwarenessChange);

    return () => {
      awareness.off('change', handleAwarenessChange);
    };
  }, [awareness, userId, userName, userColor]);

  // Cleanup: destroy providers on unmount
  useEffect(() => {
    return () => {
      provider?.destroy();
      indexeddbProvider?.destroy();
      ydoc.destroy();
    };
  }, []);

  // 30-second snapshot timer
  useEffect(() => {
    if (!provider || !ydoc || !pageId) return;

    const SNAPSHOT_INTERVAL = 30000;

    const timer = setInterval(() => {
      const content = editor?.getJSON();
      if (content) {
        const snapshot = JSON.stringify(content);
        blogService.saveSnapshot(pageId, snapshot);
      }
    }, SNAPSHOT_INTERVAL);

    return () => clearInterval(timer);
  }, [provider, ydoc, pageId, blogService]);

  // Refs for debounce
  const titleRef = useRef(blog?.title || '');
  const contentJsonRef = useRef(blog?.content);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Editor extensions - build with collaboration
  // CollaborationCursor is temporarily disabled until we fix the awareness initialization issue
  const editorExtensions = useMemo(() => {
    console.log('[Collab] editorExtensions recomputing, provider:', !!provider, 'ydoc:', !!ydoc);
    if (!provider) {
      console.log('[Collab] editorExtensions: no provider, returning base extensions');
      return [...(inlineEditableExtensions as any)];
    }
    console.log('[Collab] editorExtensions: configuring with provider, ydoc:', ydoc, 'provider:', provider);
    const baseExtensions = [...(inlineEditableExtensions as any)];
    const collabExtension = Collaboration.configure({
      document: ydoc,
      provider: provider,
    });
    console.log('[Collab] editorExtensions: Collaboration extension created:', collabExtension);
    baseExtensions.push(collabExtension);
    // CollaborationCursor requires provider.awareness.doc to exist at creation time
    // For now, we skip it and rely on basic Yjs sync for collaboration
    return baseExtensions;
  }, [ydoc, provider]);

  const editor = useEditor({
    extensions: editorExtensions,
    content: '',  // Temporarily disabled to test collaboration
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-0 py-3',
      },
    },
    immediatelyRender: false,
  });

  // Preview/Edit mode toggle - update editor editable state
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!isPreview);
  }, [editor, isPreview]);

  // Load blog and tags on mount
  useEffect(() => {
    if (pageId) {
      setBlogLoading(true);
      blogService.loadBlog(pageId).finally(() => {
        setBlogLoading(false);
      });
    }
    tagService.loadTags();
  }, [pageId, blogService, tagService]);

  // Sync state when blog changes
  useEffect(() => {
    if (blog) {
      setTitle(blog.title);
      titleRef.current = blog.title;
      setSelectedTagIds(blog.tags.map((t) => t.id));
      contentJsonRef.current = blog.content;

      // Let Y.Doc handle content via collaboration
    }
  }, [blog]);

  // Also update when pageId changes (blog might not be loaded yet)
  useEffect(() => {
    if (pageId && blog && blog.id !== pageId) {
      // Blog doesn't match the pageId, need to reload
      setBlogLoading(true);
      blogService.loadBlog(pageId).finally(() => {
        setBlogLoading(false);
      });
    }
  }, [pageId, blog, blogService]);

  // Debounced save function
  const debouncedSave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    setLocalSaving(true);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await blogService.saveBlog(blog!.id, {
          title: titleRef.current,
          content: contentJsonRef.current,
          excerpt: editor?.getText().slice(0, MAX_EXCERPT_LENGTH) || '',
          slug: slugify(titleRef.current, { lower: true, locale: 'zh', strict: false }),
        });
      } catch (error) {
        toastService.error('保存失败');
      } finally {
        setLocalSaving(false);
      }
    }, 1000);
  }, [blog?.id, blogService, editor, toastService]);

  // Handle title change
  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle);
      titleRef.current = newTitle;
      debouncedSave();
    },
    [debouncedSave]
  );

  // Handle content change in edit mode
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      contentJsonRef.current = editor.getJSON();
      debouncedSave();
    };

    editor.on('update', handleUpdate);
    return () => {
      editor.off('update', handleUpdate);
    };
  }, [editor, debouncedSave]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  // Toggle tag
  const toggleTag = useCallback(
    (tagId: string) => {
      const newTags = selectedTagIds.includes(tagId)
        ? selectedTagIds.filter((id) => id !== tagId)
        : [...selectedTagIds, tagId];
      setSelectedTagIds(newTags);
      if (blog) {
        blogService.updateBlog(blog.id, { tagIds: newTags });
      }
    },
    [selectedTagIds, blog, blogService, toastService]
  );

  // Save as draft
  const handleSaveDraft = useCallback(async () => {
    if (!editor || !blog) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    setLocalSaving(true);
    try {
      const content = editor.getJSON();
      await blogService.saveBlog(blog.id, {
        title,
        content,
        excerpt: editor?.getText().slice(0, MAX_EXCERPT_LENGTH) || '',
        status: 'draft',
      });
      toastService.success('草稿保存成功');
    } finally {
      setLocalSaving(false);
    }
  }, [blog, title, editor, blogService, toastService]);

  // Publish blog
  const handlePublish = useCallback(async () => {
    if (!editor || !blog) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    setIsPublishing(true);
    try {
      const content = editor.getJSON();
      await blogService.saveBlog(blog.id, {
        title,
        content,
        excerpt: editor?.getText().slice(0, MAX_EXCERPT_LENGTH) || '',
        status: 'published',
      });
      const publishedBlog = await blogService.publishBlog(blog.id);
      if (publishedBlog) {
        toastService.success('博客发布成功');
      }
    } finally {
      setIsPublishing(false);
    }
  }, [blog, title, editor, blogService, toastService]);

  // Word count
  const wordCount = editor?.getText().length || 0;

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!blog) return;
    if (window.confirm(`确定要删除博客 "${blog.title}" 吗？此操作不可撤销。`)) {
      blogService
        .deleteBlog(blog.id)
        .then(() => {
          toastService.success('博客已删除');
          navigate('/blogs');
        })
        .catch(() => {
          toastService.error('删除失败');
        });
    }
  }, [blog, blogService, toastService]);

  // Loading state
  if (blogLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500 dark:text-zinc-400" />
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 dark:text-zinc-400">博客不存在</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200 dark:border-zinc-700 shrink-0">
        <div className="flex items-center gap-2">
          {getDirectoryPath(blog, directoryService.directories) && (
            <span className="text-xs text-gray-500 dark:text-zinc-400">
              {getDirectoryPath(blog, directoryService.directories)} / {blog.title}
            </span>
          )}
          <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-zinc-500">
            <span>创建于 {formatDate(blog.createdAt)}</span>
            <span>修改于 {formatDate(blog.updatedAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Collaboration status */}
          {provider && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                connectionStatus === 'connected'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : connectionStatus === 'connecting'
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-zinc-700 dark:text-zinc-400'
              }`}
            >
              {connectionStatus === 'connected' ? '在线' : connectionStatus === 'connecting' ? '连接中...' : '离线'}
            </span>
          )}
          {/* Collaboration avatars - in Header, after connection status */}
          {awareness && (
            <div className="mr-2">
              <CollabAvatars awareness={awareness} currentUserId={userId} />
            </div>
          )}
          {/* Delete button */}
          <button
            onClick={handleDelete}
            className="p-1 text-gray-400 dark:text-zinc-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 rounded transition-colors"
            title="删除"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Button Group: Preview/Edit toggle */}
          <div className="flex items-center rounded overflow-hidden border border-gray-200 dark:border-zinc-600">
            <button
              onClick={() => setIsPreview(true)}
              className={`px-2 py-1 text-xs font-medium transition-colors
                ${
                  isPreview
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'bg-gray-50 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-600'
                }`}
            >
              <Eye className="w-3.5 h-3.5 inline mr-0.5" />
              预览
            </button>
            <button
              onClick={() => setIsPreview(false)}
              className={`px-2 py-1 text-xs font-medium transition-colors border-l border-gray-200 dark:border-zinc-600
                ${
                  !isPreview
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'bg-gray-50 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-600'
                }`}
            >
              <Edit2 className="w-3.5 h-3.5 inline mr-0.5" />
              编辑
            </button>
          </div>

          {/* Save draft button - only visible in edit mode */}
          {!isPreview && (
            <button
              onClick={handleSaveDraft}
              disabled={localSaving || isPublishing}
              className="p-1 text-gray-400 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
              title="保存草稿"
            >
              {localSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Publish button */}
          <button
            onClick={handlePublish}
            disabled={localSaving || isPublishing}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPublishing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            发布
          </button>
        </div>
      </div>

      {/* Editor Toolbar (only in edit mode) */}
      {!isPreview && (
        <div className="shrink-0">
          <EditorToolbar editor={editor} blogId={blog.id} />
        </div>
      )}

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 mt-6">
          {/* Title - edit mode uses input, preview mode uses h1 */}
          {isPreview ? (
            <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-50">{title}</h1>
          ) : (
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="博客标题"
              className="w-full text-3xl font-bold bg-transparent border-none focus:outline-none placeholder:text-gray-400 dark:placeholder:text-zinc-600 text-gray-900 dark:text-zinc-50"
            />
          )}

          {/* Meta info row - shown in both modes */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-gray-500 dark:text-zinc-400">{wordCount} 字</span>

            {/* Tags - edit mode supports toggle, preview mode is readonly */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-zinc-400">标签:</span>
              {tagService.tags.map((tag) =>
                isPreview ? (
                  <span
                    key={tag.id}
                    className={`
                      px-2 py-1 text-xs font-medium rounded-full
                      ${
                        selectedTagIds.includes(tag.id)
                          ? 'text-white'
                          : 'text-gray-600 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-700'
                      }
                    `}
                    style={selectedTagIds.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                  >
                    {tag.name}
                  </span>
                ) : (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`
                      px-2 py-1 text-xs font-medium rounded-full transition-colors
                      ${
                        selectedTagIds.includes(tag.id)
                          ? 'text-white'
                          : 'text-gray-600 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600'
                      }
                    `}
                    style={selectedTagIds.includes(tag.id) ? { backgroundColor: tag.color } : {}}
                  >
                    {tag.name}
                  </button>
                )
              )}
              {!isPreview && tagService.tags.length > 0 && (
                <button
                  onClick={() => {
                    /* TODO: Add tag creation */
                  }}
                  className="px-2 py-1 text-xs font-medium rounded-full border border-dashed border-gray-300 dark:border-zinc-600 text-gray-500 hover:border-primary-500 hover:text-primary-500 transition-colors"
                >
                  + 添加
                </button>
              )}
              {tagService.tags.length === 0 && (
                <span className="text-sm text-gray-400 dark:text-zinc-600">暂无标签</span>
              )}
            </div>
          </div>

          {/* Editor Content - single editor with editable controlled by isPreview */}
          <div className={isPreview ? 'prose dark:prose-invert max-w-none' : ''}>
            <EditorContent editor={editor} className={isPreview ? '' : 'min-h-[400px]'} />
          </div>

          {/* Placeholder if editor is empty (only in edit mode) */}
          {!isPreview && !editor?.getText() && (
            <div className="text-center py-12 text-gray-400 dark:text-zinc-600 pointer-events-none">
              开始写作...
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
