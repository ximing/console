import { EditorContent, Editor } from '@tiptap/react';
import type { TagDto } from '@x-console/dto';

interface BlogEditorContentProps {
  title: string;
  isPreview: boolean;
  wordCount: number;
  tags: TagDto[];
  selectedTagIds: string[];
  onTitleChange: (title: string) => void;
  toggleTag: (tagId: string) => void;
  editor: Editor | null;
}

export function BlogEditorContent({
  title,
  isPreview,
  wordCount,
  tags,
  selectedTagIds,
  onTitleChange,
  toggleTag,
  editor,
}: BlogEditorContentProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 mt-6">
      {/* Title */}
      {isPreview ? (
        <h1 className="text-3xl font-bold text-gray-900 dark:text-zinc-50">{title}</h1>
      ) : (
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="博客标题"
          className="w-full text-3xl font-bold bg-transparent border-none focus:outline-none placeholder:text-gray-400 dark:placeholder:text-zinc-600 text-gray-900 dark:text-zinc-50"
        />
      )}

      {/* Meta info row */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm text-gray-500 dark:text-zinc-400">{wordCount} 字</span>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-zinc-400">标签:</span>
          {tags.map((tag) => {
            const isSelected = selectedTagIds.includes(tag.id);
            return isPreview ? (
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
                onClick={() => toggleTag(tag.id)}
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
          {tags.length === 0 && (
            <span className="text-sm text-gray-400 dark:text-zinc-600">暂无标签</span>
          )}
        </div>
      </div>

      {/* Editor Content */}
      <div className={isPreview ? 'prose dark:prose-invert max-w-none' : ''}>
        <EditorContent editor={editor} className={isPreview ? '' : 'min-h-[400px]'} />
      </div>

      {/* Empty state placeholder */}
      {!isPreview && !editor?.getText() && (
        <div className="text-center py-12 text-gray-400 dark:text-zinc-600 pointer-events-none">
          开始写作...
        </div>
      )}
    </div>
  );
}
