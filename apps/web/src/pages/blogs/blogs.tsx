import { useEffect, useState, useRef } from 'react';
import { view, useService } from '@rabjs/react';
import { useNavigate, useLocation } from 'react-router';
import { Layout } from '../../components/layout';
import { BlogService } from '../../services/blog.service';
import { DirectoryService } from '../../services/directory.service';
import { ToastService } from '../../services/toast.service';
import { Sidebar } from './components/sidebar';
import { ResizableSidebar } from './components/sidebar/resizable-sidebar';
import { ContentArea } from './components/content';
import { SearchModal } from './components/search-modal';
import type { BlogDto } from '@x-console/dto';

type ContentMode = 'directory' | 'preview' | 'edit';

/**
 * Blog List Page
 * Displays blog posts with wiki-style sidebar + content layout
 */
export const BlogListPage = view(() => {
  const blogService = useService(BlogService);
  const directoryService = useService(DirectoryService);
  const toastService = useService(ToastService);
  const navigate = useNavigate();
  const location = useLocation();

  // UI State
  const [activeTab, setActiveTab] = useState<'directory' | 'recent'>('directory');
  const [contentMode, setContentMode] = useState<ContentMode>('directory');
  const [selectedDirectoryId, setSelectedDirectoryId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [initialExpandedIds, setInitialExpandedIds] = useState<string[]>([]);

  // Expanded directories for tree - stored but currently not read back
  const [, setExpandedDirs] = useState<Set<string>>(new Set());

  // Track previous pathname to detect navigation back to same blog
  const prevPathnameRef = useRef<string | null>(null);
  // Track if navigation was from user clicking a blog (should not switch tab)
  const isNavigatingFromBlogClickRef = useRef(false);

  // Sync URL to state on mount and URL change
  useEffect(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    // pathParts: ['blogs', 'pageId'] or ['blogs', 'pageId', 'edit']

    if (pathParts[0] === 'blogs' && pathParts.length >= 2) {
      // URL is /blogs/:blogId or /blogs/:blogId/edit
      const pageId = pathParts[1];
      const isEditMode = pathParts[2] === 'edit';
      const pathnameChanged = prevPathnameRef.current !== location.pathname;
      const wasFromBlogClick = isNavigatingFromBlogClickRef.current;
      // Reset the ref immediately so future navigations (e.g., back/forward) don't think they were from click
      isNavigatingFromBlogClickRef.current = false;

      if (pathnameChanged || selectedPageId !== pageId) {
        prevPathnameRef.current = location.pathname;
        setSelectedPageId(pageId);

        // Skip loadBlog if we just came from a blog click (already loaded in handler)
        if (!wasFromBlogClick) {
          blogService.loadBlog(pageId).then(() => {
            // After loading, set expanded state based on blog's directory
            if (blogService.currentBlog?.directoryId) {
              setInitialExpandedIds([blogService.currentBlog.directoryId]);
              setActiveTab('directory');
              setContentMode(isEditMode ? 'edit' : 'preview');
            } else {
              setActiveTab('recent');
              setContentMode(isEditMode ? 'edit' : 'preview');
            }
          });
        } else {
          // From blog click - preserve content mode but don't switch tabs
          setContentMode(isEditMode ? 'edit' : 'preview');
        }
      }
    } else if (pathParts.length === 1 && pathParts[0] === 'blogs') {
      // Root /blogs path - show directory tab
      const pathnameChanged = prevPathnameRef.current !== location.pathname;
      if (pathnameChanged || contentMode !== 'directory') {
        prevPathnameRef.current = location.pathname;
        setActiveTab('directory');
        setContentMode('directory');
        setSelectedDirectoryId(null);
        setSelectedPageId(null);
        setInitialExpandedIds([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  // Load directories on mount
  useEffect(() => {
    directoryService.loadDirectories();
    blogService.loadBlogs({ pageSize: 20 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load blogs when directory selection changes
  useEffect(() => {
    if (selectedDirectoryId) {
      setContentMode('directory');
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
        navigate(`/blogs/${blog.id}/edit`);
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
    if (!directoryId) {
      setContentMode('directory');
      navigate('/blogs');
    }
  };

  // Select page (blog) - preview mode
  const handleSelectPage = (pageId: string) => {
    // Skip if already viewing this blog in preview mode
    if (selectedPageId === pageId && contentMode === 'preview' && blogService.currentBlog?.id === pageId) {
      return;
    }
    setSelectedPageId(pageId);
    setSelectedDirectoryId(null); // Clear directory selection when blog is selected
    setContentMode('preview');
    // Only call loadBlog if not already on this page (to avoid loading flash)
    if (blogService.currentBlog?.id !== pageId) {
      blogService.loadBlog(pageId);
    }
    isNavigatingFromBlogClickRef.current = true;
    navigate(`/blogs/${pageId}`);
  };

  // Edit page (switch to inline edit mode)
  const handleEditPage = (blog: BlogDto) => {
    // Only load if different from current blog
    if (blogService.currentBlog?.id !== blog.id) {
      setSelectedPageId(blog.id);
      blogService.loadBlog(blog.id).then(() => {
        setContentMode('edit');
        navigate(`/blogs/${blog.id}/edit`);
      });
    } else {
      // Same blog, just switch mode
      setContentMode('edit');
      navigate(`/blogs/${blog.id}/edit`);
    }
  };

  // Back to directory list
  const handleBack = () => {
    setSelectedPageId(null);
    setContentMode('directory');
    navigate('/blogs');
  };

  // Expand directory (called from SearchModal)
  const handleExpandDirectory = (directoryId: string) => {
    setExpandedDirs((prev) => new Set([...prev, directoryId]));
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
            selectedBlogId={selectedPageId}
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
          <ContentArea
            mode={contentMode}
            activeTab={activeTab}
            onBack={handleBack}
            selectedDirectoryId={selectedDirectoryId}
            selectedPageId={selectedPageId}
            directoryBlogs={blogService.blogs}
            directoryLoading={directoryLoading}
            onSelectPage={handleSelectPage}
            onEditPage={handleEditPage}
          />
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
