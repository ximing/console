import { view, useService } from '@rabjs/react';
import { ActionsService } from '../../actions.service';
import { TimelineItem } from './timeline-item';

export const ActionsTimelineView = view(() => {
  const actionsService = useService(ActionsService);
  const filteredRuns = actionsService.filteredRuns;

  if (filteredRuns.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-zinc-400">
        暂无 workflow runs
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredRuns.map((run) => (
        <TimelineItem key={run.id} run={run} />
      ))}
    </div>
  );
});