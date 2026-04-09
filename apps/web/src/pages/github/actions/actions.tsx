import { useEffect } from 'react';
import { view, useService } from '@rabjs/react';
import { useNavigate } from 'react-router';
import { ActionsService } from './actions.service';
import { Layout } from '../../../components/layout';
import { GithubTabs } from '../components/github-tabs';
import { ActionsDashboard } from './components/actions-dashboard';
import { ActionsListView } from './components/actions-list-view';
import { ActionsTimelineView } from './components/actions-timeline-view';
import { ActionsControls } from './components/actions-controls';
import { Settings } from 'lucide-react';

export const ActionsPage = view(() => {
  const actionsService = useService(ActionsService);
  const navigate = useNavigate();

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

  const showEmptyState = !actionsService.isLoading && !actionsService.hasToken;

  return (
    <Layout>
      <div className="flex flex-col h-full">
        <GithubTabs />
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {showEmptyState ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="p-4 bg-gray-100 dark:bg-zinc-800 rounded-full mb-4">
                <Settings className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                GitHub Token 未配置
              </h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mb-4 max-w-md">
                请先配置 GitHub Personal Access Token 以查看所有仓库的 Actions 数据。
              </p>
              <button
                onClick={() => navigate('/settings/github')}
                className="px-4 py-2 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg hover:-translate-y-0.5"
              >
                去设置
              </button>
            </div>
          ) : (
            <>
              <ActionsDashboard />
              <ActionsControls />
              {actionsService.viewMode === 'list' ? (
                <ActionsListView />
              ) : (
                <ActionsTimelineView />
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
});