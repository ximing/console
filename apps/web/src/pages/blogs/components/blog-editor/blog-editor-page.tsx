import { useEffect, useRef } from 'react';
import { view, useService, bindServices, observer } from '@rabjs/react';
import { useParams, useNavigate } from 'react-router';
import { useEditor } from '@tiptap/react';
import { Loader2 } from 'lucide-react';
import { DirectoryService } from '../../../../services/directory.service';
import { BlogEditorService } from './blog-editor.service';
import { useCollaboration } from './hooks/useCollaboration';
import { BlogEditorHeader } from './blog-editor-header';
import { BlogEditorContent } from './blog-editor-content';
import { EditorToolbar } from './editor-toolbar';

interface BlogEditorPageProps {
  pageId?: string;
}

const BlogEditorPageInner = observer(() => {
  const params = useParams();
  const navigate = useNavigate();
  const directoryService = useService(DirectoryService);
  const blogEditor = useService(BlogEditorService);
  const initialContentSeedRef = useRef<string | null>(null);

  const pageId = params.id;

  useEffect(() => {
    blogEditor.setup(pageId, navigate);
    blogEditor.load();
  }, [pageId, navigate, blogEditor]);

  const { ydoc, provider, awareness, connectionStatus, isSynced, editorExtensions, userId } =
    useCollaboration({ pageId });

  const editor = useEditor(
    {
      extensions: editorExtensions,
      content: undefined,
      editorProps: {
        attributes: {
          class:
            'prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-0 py-3',
        },
      },
      immediatelyRender: false,
    },
    [pageId, provider, ydoc]
  );

  useEffect(() => {
    initialContentSeedRef.current = null;
  }, [pageId]);

  useEffect(() => {
    blogEditor.setEditor(editor);
  }, [editor, blogEditor]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(!blogEditor.isPreview);
  }, [editor, blogEditor.isPreview]);

  useEffect(() => {
    if (!editor || !blogEditor.blog || !isSynced) {
      return;
    }

    if (initialContentSeedRef.current === blogEditor.blog.id) {
      return;
    }

    if (!editor.isEmpty) {
      initialContentSeedRef.current = blogEditor.blog.id;
      return;
    }

    if (blogEditor.blog.content) {
      // Seed the shared Yjs document only when the synced document is still empty.
      editor.commands.setContent(blogEditor.blog.content, { emitUpdate: false });
    }

    initialContentSeedRef.current = blogEditor.blog.id;
  }, [editor, isSynced, blogEditor.blog]);

  // Set collaboration mode when provider is connected
  useEffect(() => {
    if (provider && connectionStatus === 'connected') {
      blogEditor.setCollaborationMode(true);
    } else {
      blogEditor.setCollaborationMode(false);
    }
  }, [provider, connectionStatus, blogEditor]);

  if (blogEditor.loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500 dark:text-zinc-400" />
      </div>
    );
  }

  if (!blogEditor.blog) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500 dark:text-zinc-400">博客不存在</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900">
      <BlogEditorHeader
        blog={blogEditor.blog}
        directories={directoryService.directories}
        connectionStatus={connectionStatus}
        awareness={awareness}
        currentUserId={userId}
      />

      {!blogEditor.isPreview && (
        <div className="shrink-0">
          <EditorToolbar editor={editor} blogId={blogEditor.blog.id} />
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <BlogEditorContent editor={editor} />
      </div>
    </div>
  );
});

const BlogEditorPageWithServices = bindServices(BlogEditorPageInner, [BlogEditorService]);

export const BlogEditorPage = view(({ pageId: pageIdProp }: BlogEditorPageProps) => {
  const params = useParams();
  const pageId = pageIdProp || params.id;

  return <BlogEditorPageWithServices pageId={pageId} />;
});
