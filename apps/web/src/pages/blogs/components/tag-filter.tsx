import { view } from '@rabjs/react';
import type { TagDto } from '@x-console/dto';
import { X } from 'lucide-react';

interface TagFilterProps {
  tags: TagDto[];
  selectedTagId: string | null;
  onSelectTag: (tagId: string | null) => void;
}

/**
 * Tag Filter Component
 * Horizontal scrollable tag chips for filtering blogs by tag
 */
export const TagFilter = view(({ tags, selectedTagId, onSelectTag }: TagFilterProps) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-hide">
      {/* "全部" chip */}
      <button
        onClick={() => onSelectTag(null)}
        className={`flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
          selectedTagId === null
            ? 'bg-primary-600 text-white'
            : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600'
        }`}
      >
        全部
      </button>

      {/* Tag chips */}
      {tags.map((tag) => (
        <button
          key={tag.id}
          onClick={() => onSelectTag(tag.id)}
          className={`flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
            selectedTagId === tag.id
              ? 'text-white'
              : 'hover:opacity-80'
          }`}
          style={{
            backgroundColor: selectedTagId === tag.id ? tag.color : `${tag.color}30`,
            color: selectedTagId === tag.id ? '#ffffff' : tag.color,
          }}
        >
          {tag.name}
          {selectedTagId === tag.id && (
            <X className="w-3 h-3" />
          )}
        </button>
      ))}
    </div>
  );
});
