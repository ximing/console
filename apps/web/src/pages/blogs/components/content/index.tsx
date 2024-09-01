import { useState } from 'react';
import { view, useService } from '@rabjs/react';
import { DirectoryService } from '../../../../services/directory.service';
import { BlogService } from '../../../../services/blog.service';
import { ViewToggle, type ViewMode } from '../view-toggle';
import { RecentList } from './recent-list';
import { PageList } from './page-list';
import { PagePreview } from './page-preview';
import { InlineBlogEditor } from './inline-blog-editor';
import type { BlogDto } from '@x-console/dto';

type ContentMode = 'recent' | 'directory' | 'preview' | 'edit';

interface ContentAreaProps {
  mode: ContentMode;
  selectedDirectoryId: string | null;
  selectedPageId: string | null;
  directoryBlogs: BlogDto[];
  directoryLoading: boolean;
  onBackToRecent: () => void;
  onBackToDirectory: () => void;
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

  // Edit mode - show inline editor with pre-loaded blog
  if (props.mode === 'edit' && props.selectedPageId && blogService.currentBlog) {
    return (
      <InlineBlogEditor
        blog={blogService.currentBlog}
        onBack={props.onBackToDirectory}
      />
    );
  }

  if (props.mode === 'preview' && props.selectedPageId) {
    return <PagePreview pageId={props.selectedPageId} onBack={props.onBackToDirectory} />;
  }

  if (props.mode === 'directory') {
    return (
      <PageList
        directoryId={props.selectedDirectoryId!}
        directoryName={getDirectoryName()}
        blogs={props.directoryBlogs}
        loading={props.directoryLoading}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onBack={props.onBackToRecent}
        onSelectPage={props.onSelectPage}
        onEditPage={props.onEditPage}
      />
    );
  }

  return (
    <RecentList
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onSelectPage={props.onSelectPage}
      onEditPage={props.onEditPage}
    />
  );
});
