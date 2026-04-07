import { view } from '@rabjs/react';
import { Edit2, Trash2, QrCode, Loader2, Smartphone, Apple } from 'lucide-react';
import type { AppVersionDto } from '@x-console/dto';
import { formatRelativeTime } from '../../../../../../utils/date';

interface VersionListContentProps {
  versions: AppVersionDto[];
  loading: boolean;
  onEdit: (version: AppVersionDto) => void;
  onDelete: (version: AppVersionDto) => void;
  onShowQR: (version: AppVersionDto) => void;
}

export const VersionListContent = view((props: VersionListContentProps) => {
  if (props.loading && props.versions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  if (props.versions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-zinc-500">
        <p>No versions yet. Create your first version to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto -mx-6 -mb-4">
      <table className="w-full">
        <thead className="sticky top-0 bg-gray-50/95 dark:bg-zinc-900/95 backdrop-blur-sm">
          <tr className="border-b border-gray-100 dark:border-zinc-800/60">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
              Version
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
              Build Number
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
              Changelog
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
              Platforms
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
              Status
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
          {props.versions.map((version) => (
            <tr
              key={version.id}
              className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/40 transition-all duration-150"
            >
              <td className="px-4 py-4">
                <span className="text-sm font-medium text-gray-900 dark:text-zinc-50">
                  v{version.version}
                </span>
              </td>
              <td className="px-4 py-4">
                <span className="text-sm text-gray-500 dark:text-zinc-400 font-mono">
                  {version.buildNumber}
                </span>
              </td>
              <td className="px-4 py-4">
                <span className="text-sm text-gray-500 dark:text-zinc-400 truncate max-w-xs block">
                  {version.changelog || '-'}
                </span>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  {version.androidUrl && (
                    <div className="p-1.5 rounded bg-green-50 dark:bg-green-900/20" title="Android">
                      <Smartphone className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                  )}
                  {version.iosUrl && (
                    <div className="p-1.5 rounded bg-green-50 dark:bg-green-900/20" title="iOS">
                      <Apple className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                  )}
                  {!version.androidUrl && !version.iosUrl && (
                    <span className="text-sm text-gray-400 dark:text-zinc-500">-</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-4">
                {version.isLatest ? (
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                    Latest
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400">
                    -
                  </span>
                )}
              </td>
              <td className="px-4 py-4">
                <span className="text-sm text-gray-500 dark:text-zinc-400">
                  {formatRelativeTime(version.createdAt)}
                </span>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => props.onShowQR(version)}
                    className="p-2 text-gray-500 dark:text-zinc-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 rounded-lg transition-all duration-150"
                    title="Show QR Code"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => props.onEdit(version)}
                    className="p-2 text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-all duration-150"
                    title="Edit version"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => props.onDelete(version)}
                    className="p-2 text-gray-500 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-all duration-150"
                    title="Delete version"
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
