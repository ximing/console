import { view } from '@rabjs/react';
import { Edit2, Trash2, Eye, Loader2 } from 'lucide-react';
import type { AppDto } from '@x-console/dto';
import { formatRelativeTime } from '../../../../utils/date';

interface AppListContentProps {
  apps: AppDto[];
  loading: boolean;
  onEdit: (app: AppDto) => void;
  onDelete: (app: AppDto) => void;
  onViewVersions: (appId: string) => void;
}

export const AppListContent = view((props: AppListContentProps) => {
  if (props.loading && props.apps.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  if (props.apps.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-zinc-500">
        <p>No apps yet. Create your first app to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full">
        <thead className="sticky top-0 bg-gray-50/95 dark:bg-zinc-900/95 backdrop-blur-sm">
          <tr className="border-b border-gray-100 dark:border-zinc-800/60">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
              Description
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
              Created
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/40">
          {props.apps.map((app) => (
            <tr
              key={app.id}
              className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/40 transition-all duration-150"
            >
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <Eye className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-zinc-50">
                    {app.name}
                  </span>
                </div>
              </td>
              <td className="px-4 py-4">
                <span className="text-sm text-gray-500 dark:text-zinc-400 truncate max-w-xs block">
                  {app.description || '-'}
                </span>
              </td>
              <td className="px-4 py-4">
                <span className="text-sm text-gray-500 dark:text-zinc-400">
                  {formatRelativeTime(app.createdAt)}
                </span>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => props.onViewVersions(app.id)}
                    className="p-2 text-gray-500 dark:text-zinc-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 rounded-lg transition-all duration-150"
                    title="View versions"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => props.onEdit(app)}
                    className="p-2 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-all duration-150"
                    title="Edit app"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => props.onDelete(app)}
                    className="p-2 text-gray-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-all duration-150"
                    title="Delete app"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
