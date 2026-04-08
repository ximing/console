import { view, useService } from '@rabjs/react';
import { ActionsService } from '../../actions.service';
import { RepoRunCard } from './repo-run-card';

export const ActionsListView = view(() => {
  const actionsService = useService(ActionsService);
  const grouped = actionsService.groupedByRepo;

  if (Object.keys(grouped).length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-zinc-400">
        暂无 workflow runs
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([repoName, runs]) => (
        <RepoRunCard key={repoName} repoName={repoName} runs={runs} />
      ))}
    </div>
  );
});