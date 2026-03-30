import { useState } from 'react';
import { view, useService } from '@rabjs/react';
import { Folder, Clock } from 'lucide-react';
import { DirectoryService } from '../../../../services/directory.service';
import { BlogService } from '../../../../services/blog.service';
import { ViewToggle, type ViewMode } from '../view-toggle';
import { PageList } from './page-list';
import { PagePreview } from './page-preview';
import { InlineBlogEditor } from './inline-blog-editor';
import type { BlogDto } from '@x-console/dto';

interface ContentAreaProps {
  mode: 'directory' | 'preview' | 'edit';
  activeTab: 'directory' | 'recent';
  selectedDirectoryId: string | null;
  selectedPageId: string | null;
  directoryBlogs: BlogDto[];
  directoryLoading: boolean;
  onBack: () => void;
  onSelectPage: (pageId: string) => void;
  onEditPage?: (blog: BlogDto) => void;
}

export const ContentArea = view((props: ContentAreaProps) => {
  const directoryService = useService(DirectoryService);
  const blogService = useService(BlogService);

  const [viewMode, setViewMode] = useState<ViewMode>('card');

  const getDirectoryName = (): string => {
    if (!props.selectedDirectoryId) return '';
    const dir = directoryService.directories.find((d) => d.id === props.selectedDirectoryId);
    return dir?.name || '';
  };

  if (props.mode === 'edit' && props.selectedPageId && blogService.currentBlog) {
    return <InlineBlogEditor blog={blogService.currentBlog} onBack={props.onBack} />;
  }

  if (props.mode === 'preview' && props.selectedPageId) {
    return <PagePreview pageId={props.selectedPageId} onBack={props.onBack} />;
  }

  if (props.mode === 'directory' && props.selectedDirectoryId) {
    return (
      <PageList
        directoryId={props.selectedDirectoryId}
        directoryName={getDirectoryName()}
        blogs={props.directoryBlogs}
        loading={props.directoryLoading}
        onBack={props.onBack}
        onSelectPage={props.onSelectPage}
        onEditPage={props.onEditPage}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
    );
  }

  // Empty state - different text based on activeTab
  if (props.activeTab === 'directory') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <Folder className="w-12 h-12 mb-4 opacity-50" />
        <p>请选择一个目录</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-500">
      <Clock className="w-12 h-12 mb-4 opacity-50" />
      <p>请在侧边栏选择一个博客</p>
    </div>
  );
});
