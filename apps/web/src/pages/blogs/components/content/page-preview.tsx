import { useEffect } from 'react';
import { view, useService } from '@rabjs/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { ArrowLeft, Edit2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { BlogService } from '../../../../services/blog.service';
import { DirectoryService } from '../../../../services/directory.service';

interface PagePreviewProps {
  pageId: string;
  onBack: () => void;
}

export const PagePreview = view(({ pageId, onBack }: PagePreviewProps) => {
  const blogService = useService(BlogService);
  const directoryService = useService(DirectoryService);
  const navigate = useNavigate();

  const blog = blogService.currentBlog;

  // Initialize read-only Tiptap editor
  const editor = useEditor({
    extensions: [StarterKit],
    content: blog?.content || '',
    editable: false,
    immediatelyRender: false,
  });

  // Update editor content when blog changes
  useEffect(() => {
    if (editor && blog?.content) {
      editor.commands.setContent(blog.content);
    }
  }, [editor, blog?.content]);

  const getDirectoryPath = (): string => {
    if (!blog?.directoryId) return '';
    const dir = directoryService.directories.find((d) => d.id === blog.directoryId);
    return dir?.name || '';
  };

  const handleEdit = () => {
    navigate(`/blogs/${pageId}/editor`);
  };

  if (blogService.loading || !blog) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-dark-700">
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
      <div className="flex-1 overflow-auto prose dark:prose-invert max-w-none">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
});