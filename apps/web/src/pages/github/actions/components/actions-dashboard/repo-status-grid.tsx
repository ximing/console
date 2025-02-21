import { view, useService } from '@rabjs/react';
import { ActionsService } from '../../actions.service';

const statusColors: Record<string, string> = {
  completed_success: 'bg-green-500',
  completed_failure: 'bg-red-500',
  in_progress: 'bg-blue-500',
  queued: 'bg-yellow-500',
  completed_cancelled: 'bg-gray-500',
};

function getStatusColor(status: string, conclusion: string | null): string {
  if (status === 'completed' && conclusion) {
    return statusColors[`completed_${conclusion}`] || 'bg-gray-400';
  }
  return statusColors[status] || 'bg-gray-400';
}

export const RepoStatusGrid = view(() => {
  const actionsService = useService(ActionsService);
  const repos = actionsService.groupedByRepo;

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">仓库状态</h3>
      <div className="flex flex-wrap gap-2">
        {Object.entries(repos).map(([repoFullName, runs]) => {
          const latestRun = runs[0];
          const dotColor = getStatusColor(latestRun?.status, latestRun?.conclusion);
          return (
            <div
              key={repoFullName}
              className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-50 dark:bg-zinc-700"
            >
              <span className={`w-2 h-2 rounded-full ${dotColor}`} />
              <span className="text-xs text-gray-700 dark:text-zinc-300">{repoFullName}</span>
            </div>
          );
        })}
        {Object.keys(repos).length === 0 && (
          <span className="text-sm text-gray-500 dark:text-zinc-400">暂无数据</span>
        )}
      </div>
    </div>
  );
});