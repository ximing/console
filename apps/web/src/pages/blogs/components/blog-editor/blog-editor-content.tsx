import { observer, useService } from '@rabjs/react';
import { EditorContent, Editor } from '@tiptap/react';
import { TagService } from '../../../../services/tag.service';
import { BlogEditorService } from './blog-editor.service';

interface BlogEditorContentProps {
  editor: Editor | null;
}

export const BlogEditorContent = observer(({ editor }: BlogEditorContentProps) => {
  const blogEditor = useService(BlogEditorService);
  const tagService = useService(TagService);

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
          {tagService.tags.map((tag) => {
            const isSelected = blogEditor.selectedTagIds.includes(tag.id);
            return blogEditor.isPreview ? (
              <span
                key={tag.id}
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  isSelected
                    ? 'text-white'
                    : 'text-gray-600 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-700'
                }`}
                style={isSelected ? { backgroundColor: tag.color } : {}}
              >
                {tag.name}
              </span>
            ) : (
              <button
                key={tag.id}
                onClick={() => blogEditor.toggleTag(tag.id)}
                className={`px-2 py-1 text-xs font-medium rounded-full transition-colors ${
                  isSelected
                    ? 'text-white'
                    : 'text-gray-600 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600'
                }`}
                style={isSelected ? { backgroundColor: tag.color } : {}}
              >
                {tag.name}
              </button>
            );
          })}
          {tagService.tags.length === 0 && (
            <span className="text-sm text-gray-400 dark:text-zinc-600">暂无标签</span>
          )}
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
