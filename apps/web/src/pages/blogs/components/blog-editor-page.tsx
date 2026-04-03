import { useEffect } from 'react';
import { view, useService } from '@rabjs/react';
import { useParams } from 'react-router';
import { useEditor } from '@tiptap/react';
import { Loader2 } from 'lucide-react';
import { BlogService } from '../../../services/blog.service';
import { DirectoryService } from '../../../services/directory.service';
import { TagService } from '../../../services/tag.service';
import { EditorToolbar } from './editor-toolbar';
import { BlogEditorHeader } from './blog-editor-header';
import { BlogEditorContent } from './blog-editor-content';
import { useCollaboration } from '../hooks/useCollaboration';
import { useBlogEditor } from '../hooks/useBlogEditor';

interface BlogEditorPageProps {
  pageId?: string;
}

export const BlogEditorPage = view(({ pageId: pageIdProp }: BlogEditorPageProps) => {
  const params = useParams();
  const blogService = useService(BlogService);
  const directoryService = useService(DirectoryService);
  const tagService = useService(TagService);

  // Use props if provided, otherwise fall back to URL params
  const pageId = pageIdProp || params.id;

  // First, call useBlogEditor to get the blog (needed for useCollaboration's blogUserId)
  const {
    blog,
    loading,
    title,
    selectedTagIds,
    isPreview,
    isPublishing,
    localSaving,
    handleTitleChange,
    toggleTag,
    handleSaveDraft,
    handlePublish,
    handleDelete,
    setIsPreview,
  } = useBlogEditor({ pageId, editor: null });

  // Compute wordCount from real editor (useBlogEditor can't access the real editor since it runs before useEditor)
  const wordCount = editor?.getText().length || 0;

  // Collaboration hook - needs pageId and blogUserId
  const { ydoc, provider, awareness, connectionStatus, editorExtensions, userId } =
    useCollaboration({ pageId, blogUserId: blog?.userId });

  // Create the editor with collaboration extensions
  const editor = useEditor({
    extensions: editorExtensions,
    content: undefined, // Let Collaboration extension manage content via Y.Doc
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

  // 30-second snapshot timer
  useEffect(() => {
    if (!provider || !ydoc || !pageId || !editor) return;

    const SNAPSHOT_INTERVAL = 30000;

    const timer = setInterval(() => {
      const content = editor?.getJSON();
      if (content) {
        const snapshot = JSON.stringify(content);
        blogService.saveSnapshot(pageId, snapshot);
      }
    }, SNAPSHOT_INTERVAL);

    return () => clearInterval(timer);
  }, [provider, ydoc, pageId, editor, blogService]);

  // Loading state
  if (loading) {
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
      <BlogEditorHeader
        blog={blog}
        directories={directoryService.directories}
        connectionStatus={connectionStatus}
        awareness={awareness}
        currentUserId={userId}
        isPreview={isPreview}
        localSaving={localSaving}
        isPublishing={isPublishing}
        onTogglePreview={() => setIsPreview(!isPreview)}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        onDelete={handleDelete}
      />

      {/* Editor Toolbar (only in edit mode) */}
      {!isPreview && (
        <div className="shrink-0">
          <EditorToolbar editor={editor} blogId={blog.id} />
        </div>
      )}

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-auto">
        <BlogEditorContent
          title={title}
          isPreview={isPreview}
          wordCount={wordCount}
          tags={tagService.tags}
          selectedTagIds={selectedTagIds}
          toggleTag={toggleTag}
          onTitleChange={handleTitleChange}
          editor={editor}
        />
      </div>
    </div>
  );
});
