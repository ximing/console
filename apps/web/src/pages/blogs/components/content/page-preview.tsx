import { useEffect, useState } from 'react';
import { view, useService, raw } from '@rabjs/react';
import { useEditor, EditorContent } from '@tiptap/react';
import { ArrowLeft, Edit2, Loader2 } from 'lucide-react';
import { BlogService } from '../../../../services/blog.service';
import { DirectoryService } from '../../../../services/directory.service';
import { InlineBlogEditor } from './inline-blog-editor';
import { previewExtensions } from '../../editor/tiptap.config';

interface PagePreviewProps {
  pageId: string;
  onBack: () => void;
}

export const PagePreview = view(({ pageId, onBack }: PagePreviewProps) => {
  const blogService = useService(BlogService);
  const directoryService = useService(DirectoryService);
  const [isEditing, setIsEditing] = useState(false);

  const blog = blogService.currentBlog;

  // Initialize read-only Tiptap editor with all extensions needed for rendering
  const editor = useEditor({
    extensions: previewExtensions,
    content: blog?.content ? raw(blog.content) : '',
    editable: false,
    immediatelyRender: false,
  });

  // Update editor content when blog changes
  useEffect(() => {
    if (editor && blog?.content) {
      editor.commands.setContent(raw(blog.content));
    }
  }, [editor, blog?.content]);

  // Keyboard shortcut: press 'e' to edit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'e' || e.key === 'E') {
        setIsEditing(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getDirectoryPath = (): string => {
    if (!blog?.directoryId) return '';
    const dir = directoryService.directories.find((d) => d.id === blog.directoryId);
    return dir?.name || '';
  };

  // Switch to edit mode
  const handleEdit = () => {
    setIsEditing(true);
  };

  // Switch back to preview mode
  const handleBackToPreview = () => {
    setIsEditing(false);
    // Refresh blog data
    blogService.loadBlog(pageId);
  };

  if (blogService.loading || !blog) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  // Show inline editor when in edit mode
  if (isEditing) {
    return <InlineBlogEditor blog={blog} onBack={handleBackToPreview} />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-2 border-b border-gray-200 dark:border-dark-700 shrink-0">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">{blog.title}</h1>
          {getDirectoryPath() && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {getDirectoryPath()} / {blog.title}
            </p>
          )}
        </div>
        <button
          onClick={handleEdit}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Edit2 className="w-4 h-4" />
          编辑
        </button>
      </div>

      {/* Content - Read-only Tiptap rendering */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-4xl mx-auto prose dark:prose-invert max-w-none">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
});
