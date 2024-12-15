import { observer, useService } from '@rabjs/react';
import { Eye, Edit2, Trash2, Save, Send, Loader2 } from 'lucide-react';
import { Awareness } from 'y-protocols/awareness';
import { CollabAvatars } from './collab-avatars';
import { BlogEditorService } from './blog-editor.service';
import type { BlogDto } from '@x-console/dto';

// Helper functions
const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getDirectoryPath = (
  blog: BlogDto | undefined,
  directories: { id: string; name: string }[]
): string => {
  if (!blog?.directoryId) return '';
  const dir = directories.find((d) => d.id === blog.directoryId);
  return dir?.name || '';
};

interface BlogEditorHeaderProps {
  blog: BlogDto;
  directories: { id: string; name: string }[];
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  awareness: Awareness | null;
  currentUserId: string;
}

export const BlogEditorHeader = observer(({
  blog,
  directories,
  connectionStatus,
  awareness,
  currentUserId,
}: BlogEditorHeaderProps) => {
  const blogEditor = useService(BlogEditorService);

  const directoryPath = getDirectoryPath(blog, directories);

  return (
    <div className="flex items-center justify-between px-3 py-3 border-b border-gray-200 dark:border-zinc-700 shrink-0">
      <div className="flex items-center gap-2">
        {directoryPath && (
          <span className="text-xs text-gray-500 dark:text-zinc-400">
            {directoryPath} / {blog.title}
          </span>
        )}
        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-zinc-500">
          <span>创建于 {formatDate(blog.createdAt)}</span>
          <span>修改于 {formatDate(blog.updatedAt)}</span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Collaboration status */}
        {awareness && (
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : connectionStatus === 'connecting'
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                : 'bg-gray-100 text-gray-500 dark:bg-zinc-700 dark:text-zinc-400'
            }`}
          >
            {connectionStatus === 'connected' ? '在线' : connectionStatus === 'connecting' ? '连接中...' : '离线'}
          </span>
        )}
        {/* Collaboration avatars */}
        {awareness && (
          <div className="mr-2">
            <CollabAvatars awareness={awareness} currentUserId={currentUserId} />
          </div>
        )}
        {/* Delete button */}
        <button
          onClick={() => blogEditor.deleteBlog()}
          className="p-1 text-gray-400 dark:text-zinc-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 rounded transition-colors"
          title="删除"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* Button Group: Preview/Edit toggle */}
        <div className="flex items-center rounded overflow-hidden border border-gray-200 dark:border-zinc-600">
          <button
            onClick={() => blogEditor.togglePreview()}
            className={`px-2 py-1 text-xs font-medium transition-colors
              ${
                blogEditor.isPreview
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'bg-gray-50 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-600'
              }`}
          >
            <Eye className="w-3.5 h-3.5 inline mr-0.5" />
            预览
          </button>
          <button
            onClick={() => blogEditor.togglePreview()}
            className={`px-2 py-1 text-xs font-medium transition-colors border-l border-gray-200 dark:border-zinc-600
              ${
                !blogEditor.isPreview
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'bg-gray-50 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-600'
              }`}
          >
            <Edit2 className="w-3.5 h-3.5 inline mr-0.5" />
            编辑
          </button>
        </div>

        {/* Save draft button - only visible in edit mode */}
        {!blogEditor.isPreview && (
          <button
            onClick={() => blogEditor.saveDraft()}
            disabled={blogEditor.localSaving || blogEditor.isPublishing}
            className="p-1 text-gray-400 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors disabled:opacity-50"
            title="保存草稿"
          >
            {blogEditor.localSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* Publish button */}
        <button
          onClick={() => blogEditor.publish()}
          disabled={blogEditor.localSaving || blogEditor.isPublishing}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {blogEditor.isPublishing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          发布
        </button>
      </div>
    </div>
  );
});
