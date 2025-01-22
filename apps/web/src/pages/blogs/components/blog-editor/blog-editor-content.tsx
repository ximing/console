import { observer, useService } from '@rabjs/react';
import { EditorContent, Editor } from '@tiptap/react';
import { BlogEditorService } from './blog-editor.service';
import { TagSelector } from './tag-selector';

interface BlogEditorContentProps {
  editor: Editor | null;
}

export const BlogEditorContent = observer(({ editor }: BlogEditorContentProps) => {
  const blogEditor = useService(BlogEditorService);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 mt-6">
      {/* Title */}
      {blogEditor.isPreview ? (
        <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-50">{blogEditor.title}</h1>
      ) : (
        <input
          type="text"
          value={blogEditor.title}
          onChange={(e) => blogEditor.handleTitleChange(e.target.value)}
          onBlur={() => blogEditor.saveTitleImmediately()}
          placeholder="博客标题"
          className="w-full text-3xl font-bold bg-transparent border-none focus:outline-none placeholder:text-gray-400 dark:placeholder:text-zinc-600 text-gray-900 dark:text-zinc-50"
        />
      )}

      {/* Meta info row */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm text-gray-500 dark:text-zinc-400">{blogEditor.wordCount} 字</span>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-zinc-400">标签:</span>
          <TagSelector />
        </div>
      </div>

      {/* Editor Content */}
      <div className={blogEditor.isPreview ? 'prose dark:prose-invert max-w-none' : ''}>
        <EditorContent editor={editor} className={blogEditor.isPreview ? '' : 'min-h-[400px]'} />
      </div>

      {/* Empty state placeholder */}
      {!blogEditor.isPreview && !editor?.getText() && (
        <div className="text-center py-12 text-gray-400 dark:text-zinc-600 pointer-events-none">
          开始写作...
        </div>
      )}
    </div>
  );
});
