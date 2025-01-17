import { view } from '@rabjs/react';
import { Pencil, Trash2 } from 'lucide-react';
import type { TagDto } from '@x-console/dto';

interface TagItemProps {
  tag: TagDto;
  blogCount: number;
  isSelected: boolean;
  onSelect: (tagId: string) => void;
  onEdit: (tag: TagDto) => void;
  onDelete: (tagId: string) => void;
}

export const TagItem = view(({
  tag,
  blogCount,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: TagItemProps) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(tag.id)}
      className={`group flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-all duration-150 w-full text-left rounded-lg ${
        isSelected
          ? 'bg-green-50/60 dark:bg-green-900/20 text-green-600 dark:text-green-400'
          : 'hover:bg-green-50/80 dark:hover:bg-green-900/20 text-gray-700 dark:text-zinc-300'
      }`}
    >
      {/* Color dot */}
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: tag.color }}
      />

      {/* Tag name */}
      <span className="flex-1 truncate text-xs">{tag.name}</span>

      {/* Blog count */}
      <span className="text-xs opacity-50">({blogCount})</span>

      {/* Hover actions */}
      <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onEdit(tag); }}
          className="p-1 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded"
          title="编辑标签"
        >
          <Pencil className="w-3 h-3" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(tag.id); }}
          className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 rounded"
          title="删除标签"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </button>
  );
});
