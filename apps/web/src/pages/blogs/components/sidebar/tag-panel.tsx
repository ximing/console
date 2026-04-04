import { useState, useMemo } from 'react';
import { view, useService } from '@rabjs/react';
import { Search, Plus, Tag } from 'lucide-react';
import { TagService } from '../../../../../services/tag.service';
import { BlogService } from '../../../../../services/blog.service';
import type { TagDto } from '@x-console/dto';
import { TagItem } from './tag-item';
import { TagModal } from './tag-modal';

interface TagPanelProps {
  selectedTagId: string | null; // null means "All"
  onSelectTag: (tagId: string | null) => void;
}

export const TagPanel = view((props: TagPanelProps) => {
  const tagService = useService(TagService);
  const blogService = useService(BlogService);

  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTag, setEditingTag] = useState<TagDto | null>(null);

  // Calculate blog count per tag
  const tagBlogCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    blogService.blogs.forEach((blog) => {
      if (blog.tags && Array.isArray(blog.tags)) {
        blog.tags.forEach((tagId: string) => {
          counts[tagId] = (counts[tagId] || 0) + 1;
        });
      }
    });

    return counts;
  }, [blogService.blogs]);

  // Total blog count (blogs that have at least one tag)
  const totalTaggedBlogs = useMemo(() => {
    return blogService.blogs.filter(
      (blog) => blog.tags && Array.isArray(blog.tags) && blog.tags.length > 0
    ).length;
  }, [blogService.blogs]);

  // Filter tags by search query
  const filteredTags = useMemo(() => {
    return tagService.searchTags(searchQuery);
  }, [tagService.tags, searchQuery]);

  const handleSelectTag = (tagId: string) => {
    // Toggle selection: if already selected, deselect (go to "All")
    if (props.selectedTagId === tagId) {
      props.onSelectTag(null);
    } else {
      props.onSelectTag(tagId);
    }
  };

  const handleSelectAll = () => {
    props.onSelectTag(null);
  };

  const handleOpenCreateModal = () => {
    setEditingTag(null);
    setModalVisible(true);
  };

  const handleOpenEditModal = (tag: TagDto) => {
    setEditingTag(tag);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingTag(null);
  };

  const handleSaveTag = () => {
    // Tag service already handles the save, just refresh if needed
    // The view will auto-update due to @rabjs/react reactivity
  };

  const handleDeleteTag = async (tagId: string) => {
    const tag = tagService.getTagById(tagId);
    if (!tag) return;

    const blogCount = tagBlogCounts[tagId] || 0;
    const confirmed = window.confirm(
      blogCount > 0
        ? `该标签被 ${blogCount} 篇博客使用，删除后将从这些博客中移除。确定删除吗？`
        : `确定要删除该标签吗？`
    );
    if (confirmed) {
      await tagService.deleteTag(tagId);
      if (props.selectedTagId === tagId) {
        props.onSelectTag(null);
      }
    }
  };

  // Loading state
  if (tagService.loading && tagService.tags.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索标签..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100/80 dark:bg-zinc-800/80 border-0 rounded-lg text-gray-900 dark:text-zinc-50 placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-green-500 transition-all"
          />
        </div>
      </div>

      {/* "All" option */}
      <div className="px-3 pb-1">
        <button
          type="button"
          onClick={handleSelectAll}
          className={`group flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-all duration-150 w-full text-left rounded-lg ${
            props.selectedTagId === null
              ? 'bg-green-50/60 dark:bg-green-900/20 text-green-600 dark:text-green-400'
              : 'hover:bg-green-50/80 dark:hover:bg-green-900/20 text-gray-700 dark:text-zinc-300'
          }`}
        >
          <Tag className="w-4 h-4 flex-shrink-0 opacity-60" />
          <span className="flex-1 truncate text-xs font-medium">全部</span>
          <span className="text-xs opacity-50">({totalTaggedBlogs})</span>
        </button>
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-gray-100 dark:border-zinc-800" />

      {/* Tag list */}
      <div className="flex-1 overflow-auto py-1">
        {filteredTags.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-gray-500 dark:text-zinc-500">
            {searchQuery ? '未找到匹配的标签' : '暂无标签'}
          </div>
        ) : (
          filteredTags.map((tag) => (
            <TagItem
              key={tag.id}
              tag={tag}
              blogCount={tagBlogCounts[tag.id] || 0}
              isSelected={props.selectedTagId === tag.id}
              onSelect={handleSelectTag}
              onEdit={handleOpenEditModal}
              onDelete={handleDeleteTag}
            />
          ))
        )}
      </div>

      {/* Create button */}
      <div className="px-3 py-2 border-t border-gray-100 dark:border-zinc-800">
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          新建标签
        </button>
      </div>

      {/* Tag Modal */}
      <TagModal
        visible={modalVisible}
        tag={editingTag}
        onClose={handleCloseModal}
        onSave={handleSaveTag}
      />
    </div>
  );
});
