import { useState, useRef, useEffect } from 'react';
import { view, useService } from '@rabjs/react';
import { Plus, X, Check } from 'lucide-react';
import { TagService } from '../../../../services/tag.service';
import { BlogEditorService } from './blog-editor.service';
const PRESET_COLORS = [
  '#22c55e', '#3b82f6', '#ef4444', '#f59e0b',
  '#8b5cf6', '#ec4899', '#6b7280', '#14b8a6',
];

export const TagSelector = view(() => {
  const tagService = useService(TagService);
  const blogEditor = useService(BlogEditorService);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Focus input when popover opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const selectedTags = tagService.tags.filter((t) =>
    blogEditor.selectedTagIds.includes(t.id)
  );

  const filteredTags = tagService.searchTags(searchQuery);

  const handleToggleTag = (tagId: string) => {
    blogEditor.toggleTag(tagId);
  };

  const handleCreateTag = async () => {
    const trimmed = newTagName.trim();
    if (!trimmed || trimmed.length > 20) return;
    if (tagService.isTagNameTaken(trimmed)) return;

    const tag = await tagService.createTag({ name: trimmed, color: newTagColor });
    if (tag) {
      blogEditor.toggleTag(tag.id);
      setNewTagName('');
      setNewTagColor(PRESET_COLORS[0]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    blogEditor.toggleTag(tagId);
  };

  return (
    <div className="relative inline-flex items-center gap-2 flex-wrap">
      {/* Selected tags display */}
      {selectedTags.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full text-white"
          style={{ backgroundColor: tag.color }}
        >
          {tag.name}
          <button
            type="button"
            onClick={() => handleRemoveTag(tag.id)}
            className="hover:bg-white/20 rounded-full p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      {/* Add button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded-full transition-colors"
      >
        <Plus className="w-3 h-3" />
        {blogEditor.isPreview ? '添加标签' : '添加'}
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute top-full left-0 mt-2 w-72 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-gray-200 dark:border-zinc-700 z-50 overflow-hidden"
        >
          {/* Search */}
          <div className="p-2 border-b border-gray-100 dark:border-zinc-800">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索标签..."
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400"
            />
          </div>

          {/* Tag list */}
          <div className="max-h-48 overflow-auto p-1">
            {filteredTags.length === 0 && !searchQuery && (
              <div className="px-3 py-4 text-center text-xs text-gray-500 dark:text-zinc-500">
                暂无标签
              </div>
            )}
            {filteredTags.length === 0 && searchQuery && (
              <div className="px-3 py-4 text-center text-xs text-gray-500 dark:text-zinc-500">
                未找到匹配的标签
              </div>
            )}
            {filteredTags.map((tag) => {
              const isSelected = blogEditor.selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleToggleTag(tag.id)}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-sm cursor-pointer rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-green-50/60 dark:bg-green-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="flex-1 text-left text-xs text-gray-700 dark:text-zinc-300 truncate">
                    {tag.name}
                  </span>
                  {isSelected && (
                    <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick create */}
          <div className="p-2 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-800/50">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                placeholder="新建标签..."
                maxLength={20}
                className="flex-1 px-2 py-1.5 text-xs bg-white dark:bg-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400"
              />
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-0"
              />
              <button
                type="button"
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || newTagName.trim().length > 20}
                className="px-2 py-1.5 text-xs font-medium text-white bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
