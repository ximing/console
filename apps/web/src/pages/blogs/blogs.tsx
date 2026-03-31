import { useEffect, useState } from 'react';
import { view, useService } from '@rabjs/react';
import { useNavigate } from 'react-router';
import { Layout } from '../../components/layout';
import { BlogService } from '../../services/blog.service';
import { DirectoryService } from '../../services/directory.service';
import { ToastService } from '../../services/toast.service';
import { Sidebar } from './components/sidebar';
import { ResizableSidebar } from './components/sidebar/resizable-sidebar';
import { PageList } from './components/content/page-list';
import { SearchModal } from './components/search-modal';
import type { BlogDto } from '@x-console/dto';
import type { ViewMode } from './components/view-toggle';

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
  const [activeTab, setActiveTab] = useState<'directory' | 'recent'>('directory');
  const [selectedDirectoryId, setSelectedDirectoryId] = useState<string | null>(null);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [initialExpandedIds, setInitialExpandedIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  // Load directories on mount
  useEffect(() => {
    directoryService.loadDirectories();
    blogService.loadBlogs({ pageSize: 20 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load blogs when directory selection changes
  useEffect(() => {
    if (selectedDirectoryId) {
      setDirectoryLoading(true);
      blogService
        .loadBlogs({ directoryId: selectedDirectoryId, pageSize: 1000 })
        .finally(() => setDirectoryLoading(false));
    } else {
      // Load all blogs when viewing all
      blogService.loadBlogs({ pageSize: 1000 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDirectoryId]);

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
        navigate(`/blogs/editor/${blog.id}`);
      }
    } catch {
      toastService.error('创建博客失败');
    }
  };

  // Create new directory
  const handleCreateDirectory = async (parentId?: string) => {
    try {
      const name = prompt('请输入目录名称');
      if (!name) return;
      await directoryService.createDirectory({ name, parentId });
      toastService.success('目录创建成功');
    } catch {
      toastService.error('创建目录失败');
    }
  };

  // Select directory
  const handleSelectDirectory = (directoryId: string | null) => {
    setSelectedDirectoryId(directoryId);
  };

  // Select page (blog) - navigate to editor page
  const handleSelectPage = (pageId: string) => {
    // Navigate to editor page (which shows preview mode by default)
    navigate(`/blogs/editor/${pageId}`);
  };

  // Edit page (switch to inline edit mode)
  const handleEditPage = (blog: BlogDto) => {
    // Navigate to editor page
    navigate(`/blogs/editor/${blog.id}`);
  };

  // Back to directory list
  const handleBack = () => {
    setSelectedDirectoryId(null);
  };

  // Expand directory (called from SearchModal)
  const handleExpandDirectory = (directoryId: string) => {
    setInitialExpandedIds((prev) => [...prev, directoryId]);
  };

  return (
    <Layout>
      <div className="flex h-full">
        {/* Left Sidebar */}
        <ResizableSidebar
          onSearchClick={() => setSearchModalVisible(true)}
          onNewBlog={() => handleCreateBlog(selectedDirectoryId)}
        >
          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            selectedBlogId={null}
            onSelectBlog={handleSelectPage}
            initialExpandedIds={initialExpandedIds}
            selectedDirectoryId={selectedDirectoryId}
            onSelectDirectory={handleSelectDirectory}
            onSearchClick={() => setSearchModalVisible(true)}
            onNewBlog={(dirId) => handleCreateBlog(dirId ?? selectedDirectoryId)}
            onNewDirectory={(parentId) => handleCreateDirectory(parentId)}
            onContextMenuDirectory={() => {}}
            onContextMenuPage={() => {}}
          />
        </ResizableSidebar>

        {/* Right Content Area */}
        <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-dark-900">
          {selectedDirectoryId ? (
            <PageList
              directoryId={selectedDirectoryId}
              directoryName={directoryService.directories.find((d) => d.id === selectedDirectoryId)?.name || ''}
              blogs={blogService.blogs}
              loading={directoryLoading}
              onBack={handleBack}
              onSelectPage={handleSelectPage}
              onEditPage={handleEditPage}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p>请选择一个目录</p>
            </div>
          )}
        </div>

        {/* Search Modal */}
        <SearchModal
          visible={searchModalVisible}
          onClose={() => setSearchModalVisible(false)}
          onSelectPage={handleSelectPage}
          onExpandDirectory={handleExpandDirectory}
        />
      </div>
    </Layout>
  );
});
