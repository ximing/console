import { useEffect, useState } from 'react';
import { view, useService } from '@rabjs/react';
import { useNavigate, useParams } from 'react-router';
import { Layout } from '../../components/layout';
import { BlogService } from '../../services/blog.service';
import { DirectoryService } from '../../services/directory.service';
import { ToastService } from '../../services/toast.service';
import { Sidebar } from './components/sidebar';
import { ResizableSidebar } from './components/sidebar/resizable-sidebar';
import { PageList } from './components/content/page-list';
import { BlogEditorPage } from './components/blog-editor-page';
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
  const params = useParams();

  // Get selected blog id from URL (e.g., /blogs/:id)
  const selectedBlogId = params.id;

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
        navigate(`/blogs/${blog.id}`);
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
    // If selecting a specific directory (not "all blogs"), navigate to /blogs to clear selectedBlogId
    if (directoryId !== null && selectedBlogId) {
      navigate('/blogs');
    }
    setSelectedDirectoryId(directoryId);
  };

  // Select page (blog) - navigate to editor page
  const handleSelectPage = (pageId: string) => {
    // Navigate to editor page (which shows preview mode by default)
    navigate(`/blogs/${pageId}`);
  };

  // Edit page (switch to inline edit mode)
  const handleEditPage = (blog: BlogDto) => {
    // Navigate to editor page
    navigate(`/blogs/${blog.id}`);
  };

  // Back to directory list
  const handleBack = () => {
    if (selectedBlogId) {
      navigate('/blogs');
    } else {
      setSelectedDirectoryId(null);
    }
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
            selectedBlogId={selectedBlogId || null}
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
        <div className="flex-1 overflow-hidden bg-gray-50 dark:bg-zinc-950">
          {selectedBlogId ? (
            <BlogEditorPage
              pageId={selectedBlogId}
            />
          ) : selectedDirectoryId ? (
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
