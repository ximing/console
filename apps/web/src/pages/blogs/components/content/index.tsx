import { view, useService } from '@rabjs/react';
import { BlogService } from '../../../services/blog.service';
import { DirectoryService } from '../../../services/directory.service';
import { RecentList } from './recent-list';
import { PageList } from './page-list';
import { PagePreview } from './page-preview';

type ContentMode = 'recent' | 'directory' | 'preview';

interface ContentAreaProps {
  mode: ContentMode;
  selectedDirectoryId: string | null;
  selectedPageId: string | null;
  directoryBlogs: any[];
  directoryLoading: boolean;
  onBackToRecent: () => void;
  onBackToDirectory: () => void;
  onSelectPage: (pageId: string) => void;
}

export const ContentArea = view((props: ContentAreaProps) => {
  const directoryService = useService(DirectoryService);

  const getDirectoryName = (): string => {
    if (!props.selectedDirectoryId) return '';
    const dir = directoryService.directories.find((d) => d.id === props.selectedDirectoryId);
    return dir?.name || '';
  };

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
        onBack={props.onBackToRecent}
        onSelectPage={props.onSelectPage}
      />
    );
  }

  return <RecentList onSelectPage={props.onSelectPage} />;
});