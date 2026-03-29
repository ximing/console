import { useEffect, useState } from 'react';
import { view, useService } from '@rabjs/react';
import { useNavigate } from 'react-router';
import { Layout } from '../../components/layout';
import { BlogService } from '../../services/blog.service';
import { DirectoryService } from '../../services/directory.service';
import { ToastService } from '../../services/toast.service';
import { Sidebar } from './components/sidebar';
import { ContentArea } from './components/content';
import { SearchModal } from './components/search-modal';
import { ContextMenu, type ContextMenuItem } from './components/context-menu';
import type { DirectoryTreeNode } from '../../services/directory.service';
import type { BlogDto } from '@x-console/dto';

type ContentMode = 'recent' | 'directory' | 'preview';

/**
 * Blog List Page
 * Displays blog posts with wiki-style sidebar + content layout
 */
export const BlogListPage = view(() => {
  const blogService = useService(BlogService);
  const directoryService = useService(DirectoryService);
  const toastService = useService(ToastService);
  const navigate = useNavigate();

  // UI State
  const [contentMode, setContentMode] = useState<ContentMode>('recent');
  const [selectedDirectoryId, setSelectedDirectoryId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [directoryLoading, setDirectoryLoading] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    type: 'directory' | 'page';
    data: DirectoryTreeNode | BlogDto | null;
  }>({ visible: false, x: 0, y: 0, type: 'directory', data: null });

  // Expanded directories for tree - stored but currently not read back
  const [, setExpandedDirs] = useState<Set<string>>(new Set());

  // Load directories on mount
  useEffect(() => {
    directoryService.loadDirectories();
    blogService.loadBlogs({ pageSize: 20 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load directory blogs when directory is selected
  useEffect(() => {
    if (selectedDirectoryId) {
      setContentMode('directory');
      setDirectoryLoading(true);
      blogService
        .loadBlogs({ directoryId: selectedDirectoryId, pageSize: 1000 })
        .finally(() => setDirectoryLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDirectoryId]);

  // Load full blog content when entering preview
  useEffect(() => {
    if (selectedPageId) {
      setContentMode('preview');
      blogService.loadBlog(selectedPageId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPageId]);

  // Create new blog
  const handleCreateBlog = async (directoryId: string | null) => {
    try {
      const blog = await blogService.createBlog({
        title: '未命名博客',
        excerpt: '',
        directoryId: directoryId || undefined,
      });

      if (blog) {
        toastService.success('博客创建成功');
        navigate(`/blogs/${blog.id}/editor`);
      }
    } catch {
      toastService.error('创建博客失败');
    }
  };

  // Create new directory - handled inline in DirectoryTree via context menu
  const handleCreateDirectory = async () => {
    // The DirectoryTree component handles directory creation inline
    // This is a no-op placeholder for the Sidebar action button
  };

  // Rename directory
  const handleRenameDirectory = async (directoryId: string, newName: string) => {
    try {
      await directoryService.updateDirectory(directoryId, { name: newName });
      toastService.success('目录重命名成功');
    } catch {
      toastService.error('重命名目录失败');
    }
  };

  // Delete directory
  const handleDeleteDirectory = async (directoryId: string) => {
    try {
      await directoryService.deleteDirectory(directoryId);
      toastService.success('目录删除成功');
      if (selectedDirectoryId === directoryId) {
        setSelectedDirectoryId(null);
        setContentMode('recent');
      }
    } catch {
      toastService.error('删除目录失败');
    }
  };

  // Delete blog
  const handleDeleteBlog = async (blogId: string) => {
    try {
      await blogService.deleteBlog(blogId);
      toastService.success('博客删除成功');
      if (selectedPageId === blogId) {
        setSelectedPageId(null);
        setContentMode(selectedDirectoryId ? 'directory' : 'recent');
      }
    } catch {
      toastService.error('删除博客失败');
    }
  };

  // Move blog to different directory
  const handleMoveBlog = async (blogId: string, newDirectoryId: string | null) => {
    try {
      await blogService.updateBlog(blogId, { directoryId: newDirectoryId || undefined });
      toastService.success('博客移动成功');
    } catch {
      toastService.error('移动博客失败');
    }
  };

  // Select directory
  const handleSelectDirectory = (directoryId: string | null) => {
    setSelectedDirectoryId(directoryId);
    if (!directoryId) {
      setContentMode('recent');
    }
  };

  // Select page (blog)
  const handleSelectPage = (pageId: string) => {
    setSelectedPageId(pageId);
    setContentMode('preview');
    blogService.loadBlog(pageId);
  };

  // Back to recent list
  const handleBackToRecent = () => {
    setContentMode('recent');
    setSelectedDirectoryId(null);
    setSelectedPageId(null);
    blogService.loadBlogs({ pageSize: 20 });
  };

  // Back to directory
  const handleBackToDirectory = () => {
    if (selectedDirectoryId) {
      setContentMode('directory');
      setSelectedPageId(null);
    } else {
      setContentMode('recent');
      setSelectedPageId(null);
    }
  };

  // Expand directory (called from SearchModal)
  const handleExpandDirectory = (directoryId: string) => {
    setExpandedDirs((prev) => new Set([...prev, directoryId]));
  };

  // Context menu for directory
  const handleContextMenuDirectory = (e: React.MouseEvent, node: DirectoryTreeNode) => {
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      type: 'directory',
      data: node,
    });
  };

  // Context menu for page
  const handleContextMenuPage = (e: React.MouseEvent, blog: BlogDto) => {
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      type: 'page',
      data: blog,
    });
  };

  // Get context menu items for directory
  const getDirectoryContextMenuItems = (): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [
      {
        label: '新建博客',
        onClick: () => handleCreateBlog(contextMenu.data.id),
      },
      {
        label: '新建子目录',
        onClick: async () => {
          // Trigger new directory creation with parentId
          const name = prompt('请输入目录名称：');
          if (name) {
            try {
              await directoryService.createDirectory({
                name,
                parentId: contextMenu.data.id,
              });
              toastService.success('目录创建成功');
              // Expand the parent directory
              setExpandedDirs((prev) => new Set([...prev, contextMenu.data.id]));
            } catch {
              toastService.error('创建目录失败');
            }
          }
        },
      },
      {
        label: '重命名',
        onClick: () => {
          const newName = prompt('请输入新名称：', contextMenu.data.name);
          if (newName && newName !== contextMenu.data.name) {
            handleRenameDirectory(contextMenu.data.id, newName);
          }
        },
      },
      {
        label: '删除',
        danger: true,
        onClick: () => {
          if (confirm('确定要删除这个目录吗？目录下的博客不会被删除。')) {
            handleDeleteDirectory(contextMenu.data.id);
          }
        },
      },
    ];
    return items;
  };

  // Get context menu items for page
  const getPageContextMenuItems = (): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [
      {
        label: '编辑',
        onClick: () => navigate(`/blogs/${contextMenu.data.id}/editor`),
      },
      {
        label: '移动到...',
        onClick: () => {
          const dirId = prompt('请输入目标目录ID（留空移到根目录）：');
          handleMoveBlog(contextMenu.data.id, dirId || null);
        },
      },
      {
        label: '删除',
        danger: true,
        onClick: () => {
          if (confirm('确定要删除这篇博客吗？')) {
            handleDeleteBlog(contextMenu.data.id);
          }
        },
      },
    ];
    return items;
  };

  return (
    <Layout>
      <div className="flex h-full">
        {/* Left Sidebar */}
        <div className="w-[240px] flex-shrink-0">
          <Sidebar
            selectedDirectoryId={selectedDirectoryId}
            selectedPageId={selectedPageId}
            onSelectDirectory={handleSelectDirectory}
            onSelectPage={handleSelectPage}
            onSearchClick={() => setSearchModalVisible(true)}
            onNewBlog={() => handleCreateBlog(selectedDirectoryId)}
            onNewDirectory={() => handleCreateDirectory()}
            onContextMenuDirectory={handleContextMenuDirectory}
            onContextMenuPage={handleContextMenuPage}
            onExpandDirectory={handleExpandDirectory}
          />
        </div>

        {/* Right Content Area */}
        <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-dark-900 p-6">
          <ContentArea
            mode={contentMode}
            selectedDirectoryId={selectedDirectoryId}
            selectedPageId={selectedPageId}
            directoryBlogs={blogService.blogs}
            directoryLoading={directoryLoading}
            onBackToRecent={handleBackToRecent}
            onBackToDirectory={handleBackToDirectory}
            onSelectPage={handleSelectPage}
          />
        </div>

        {/* Search Modal */}
        <SearchModal
          visible={searchModalVisible}
          onClose={() => setSearchModalVisible(false)}
          onSelectPage={handleSelectPage}
          onExpandDirectory={handleExpandDirectory}
        />

        {/* Context Menu */}
        <ContextMenu
          visible={contextMenu.visible}
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.type === 'directory' ? getDirectoryContextMenuItems() : getPageContextMenuItems()}
          onClose={() => setContextMenu((prev) => ({ ...prev, visible: false }))}
        />
      </div>
    </Layout>
  );
});
