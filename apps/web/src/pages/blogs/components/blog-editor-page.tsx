import { useEffect } from 'react';
import { view, useService, bindServices, observer } from '@rabjs/react';
import { useParams, useNavigate } from 'react-router';
import { useEditor } from '@tiptap/react';
import { Loader2 } from 'lucide-react';
import { DirectoryService } from '../../../services/directory.service';
import { BlogEditorService } from '../blog-editor.service';
import { useCollaboration } from '../hooks/useCollaboration';
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

  // pageId from URL params — synchronous, available on every render
  const pageId = params.id;

  // Set up service with navigate and load blog on mount
  useEffect(() => {
    blogEditor.setup(pageId, navigate);
    blogEditor.load();
  }, [pageId, navigate, blogEditor]);

  // Collaboration hook
  const { ydoc, provider, awareness, connectionStatus, editorExtensions, userId } =
    useCollaboration({ pageId, blogUserId: blogEditor.blog?.userId });

  // Create the editor with collaboration extensions
  const editor = useEditor({
    extensions: editorExtensions,
    content: undefined,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-0 py-3',
      },
    },
    immediatelyRender: false,
  });

  // Inject editor into service after useEditor returns
  useEffect(() => {
    blogEditor.setEditor(editor);
  }, [editor, blogEditor]);

  // Sync editable state when preview mode changes
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!blogEditor.isPreview);
  }, [editor, blogEditor.isPreview]);

  // 30-second snapshot timer
  useEffect(() => {
    if (!provider || !ydoc || !pageId || !editor) return;

    const SNAPSHOT_INTERVAL = 30000;
    const timer = setInterval(() => {
      const content = editor?.getJSON();
      if (content) {
        blogEditor.blogService.saveSnapshot(pageId, JSON.stringify(content));
      }
    }, SNAPSHOT_INTERVAL);

    return () => clearInterval(timer);
  }, [provider, ydoc, pageId, editor, blogEditor.blogService]);

  // Loading state
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
      {/* Header */}
      <BlogEditorHeader
        blog={blogEditor.blog}
        directories={directoryService.directories}
        connectionStatus={connectionStatus}
        awareness={awareness}
        currentUserId={userId}
      />

      {/* Editor Toolbar (only in edit mode) */}
      {!blogEditor.isPreview && (
        <div className="shrink-0">
          <EditorToolbar editor={editor} blogId={blogEditor.blog.id} />
        </div>
      )}

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-auto">
        <BlogEditorContent editor={editor} />
      </div>
    </div>
  );
});

// bindServices must be called at module level, not inside render
const BlogEditorPageWithServices = bindServices(BlogEditorPageInner, [BlogEditorService]);

export const BlogEditorPage = view(({ pageId: pageIdProp }: BlogEditorPageProps) => {
  const params = useParams();
  const pageId = pageIdProp || params.id;

  // Set pageId on service synchronously before inner observer mounts.
  // Since useService can only be called inside a Provider, we do it via a sync guard
  // inside the wrapped component itself (see BlogEditorPageInner's first-render logic).
  // Here we just render the bound content.
  return <BlogEditorPageWithServices pageId={pageId} />;
});
