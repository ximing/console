import { useEffect } from 'react';
import { view, useService } from '@rabjs/react';
import { MessageSquare, BarChart3, Users } from 'lucide-react';

import { Layout } from '../../components/layout';
import { BlogEngagementService } from './blog-engagement.service';
import { CommentsPanel } from './components/comments-panel';
import { StatsPanel } from './components/stats-panel';
import { VisitorsPanel } from './components/visitors-panel';

import type { BlogEngagementTab } from './blog-engagement.service';

const TABS: { key: BlogEngagementTab; label: string; icon: typeof MessageSquare }[] = [
  { key: 'comments', label: '评论管理', icon: MessageSquare },
  { key: 'stats', label: '数据总览', icon: BarChart3 },
  { key: 'visitors', label: '访客管理', icon: Users },
];

export const BlogEngagementPage = view(() => {
  const service = useService(BlogEngagementService);

  useEffect(() => {
    service.setTab('comments');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout>
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-4 py-3 shrink-0 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_8px_rgba(0,0,0,0.2)]">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => service.setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all ${
                service.activeTab === key
                  ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-dark-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-4">
          {service.activeTab === 'comments' && <CommentsPanel />}
          {service.activeTab === 'stats' && <StatsPanel />}
          {service.activeTab === 'visitors' && <VisitorsPanel />}
        </div>
      </div>
    </Layout>
  );
});
