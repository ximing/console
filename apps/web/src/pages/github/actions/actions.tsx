import { useEffect } from 'react';
import { view, useService } from '@rabjs/react';
import { ActionsService } from './actions.service';
import { Layout } from '../../../components/layout';
import { GithubTabs } from '../components/github-tabs';
import { ActionsDashboard } from './components/actions-dashboard';
import { ActionsListView } from './components/actions-list-view';
import { ActionsTimelineView } from './components/actions-timeline-view';
import { ActionsControls } from './components/actions-controls';

export const ActionsPage = view(() => {
  const actionsService = useService(ActionsService);

  useEffect(() => {
    actionsService.loadRuns();

    return () => {
      actionsService.stopPolling();
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        actionsService.stopPolling();
      } else if (actionsService.pollInterval > 0) {
        actionsService.startPolling(actionsService.pollInterval);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [actionsService.pollInterval]);

  return (
    <Layout>
      <div className="flex flex-col h-full">
        <GithubTabs />
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <ActionsDashboard />
          <ActionsControls />
          {actionsService.viewMode === 'list' ? (
            <ActionsListView />
          ) : (
            <ActionsTimelineView />
          )}
        </div>
      </div>
    </Layout>
  );
});