import { observer, useService } from '@rabjs/react';
import { Eye, Edit2, Trash2, Send, Loader2 } from 'lucide-react';
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
    <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)]">
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

      <div className="flex items-center gap-3">
        {/* Collaboration status */}
        {awareness && (
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${
              connectionStatus === 'connected'
                ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]'
                : connectionStatus === 'connecting'
                ? 'bg-amber-500 animate-pulse'
                : 'bg-gray-400'
            }`} />
            <span className="text-xs text-gray-500 dark:text-zinc-400">
              {connectionStatus === 'connected' ? '在线' : connectionStatus === 'connecting' ? '连接中...' : '离线'}
            </span>
          </div>
        )}
        {/* Collaboration avatars */}
        {awareness && (
          <CollabAvatars awareness={awareness} currentUserId={currentUserId} />
        )}
        {/* Delete button */}
        <button
          onClick={() => blogEditor.deleteBlog()}
          className="p-1.5 text-gray-400 dark:text-zinc-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 rounded-lg transition-colors"
          title="删除"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        {/* Button Group: Preview/Edit toggle */}
        <div className="flex items-center rounded-lg bg-gray-100 dark:bg-zinc-800 p-0.5 gap-0.5">
          <button
            onClick={() => blogEditor.togglePreview()}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150
              ${
                blogEditor.isPreview
                  ? 'bg-white dark:bg-zinc-700 shadow-sm text-green-600 dark:text-green-400'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'
              }`}
          >
            <Eye className="w-3.5 h-3.5 inline mr-1" />
            预览
          </button>
          <button
            onClick={() => blogEditor.togglePreview()}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150
              ${
                !blogEditor.isPreview
                  ? 'bg-white dark:bg-zinc-700 shadow-sm text-green-600 dark:text-green-400'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200'
              }`}
          >
            <Edit2 className="w-3.5 h-3.5 inline mr-1" />
            编辑
          </button>
        </div>

        {/* Publish button */}
        <button
          onClick={() => blogEditor.publish()}
          disabled={blogEditor.localSaving || blogEditor.isPublishing}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 rounded-lg shadow-[0_2px_8px_rgba(34,197,94,0.3)] hover:shadow-[0_4px_12px_rgba(34,197,94,0.4)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
