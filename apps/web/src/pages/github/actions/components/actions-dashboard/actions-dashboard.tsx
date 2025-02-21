import { view, useService } from '@rabjs/react';
import { ActionsService } from '../../actions.service';
import { StatsCard } from './stats-card';
import { RepoStatusGrid } from './repo-status-grid';

export const ActionsDashboard = view(() => {
  const actionsService = useService(ActionsService);
  const { total, success, failure, running } = actionsService.stats;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard label="总运行数" value={total} color="gray" />
        <StatsCard label="成功" value={success} color="green" />
        <StatsCard label="失败" value={failure} color="red" />
        <StatsCard label="运行中" value={running} color="blue" />
      </div>
      <RepoStatusGrid />
    </div>
  );
});