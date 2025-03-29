import { view, useService } from '@rabjs/react';
import { Eye, Heart, MessageSquare, Users, Loader2 } from 'lucide-react';

import { BlogEngagementService } from '../blog-engagement.service';

export const StatsPanel = view(() => {
  const service = useService(BlogEngagementService);
  const overview = service.overview;

  if (service.loading || !overview) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    );
  }

  const cards = [
    { label: '总阅读量', value: overview.totalViews, icon: Eye },
    { label: '总点赞', value: overview.totalLikes, icon: Heart },
    { label: '总评论', value: overview.totalComments, icon: MessageSquare },
    { label: '总访客', value: overview.totalVisitors, icon: Users },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {cards.map(({ label, value, icon: Icon }) => (
          <div key={label}
            className="p-4 rounded-xl bg-white dark:bg-dark-800 shadow-sm border border-gray-100 dark:border-dark-700">
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
              <Icon className="w-3.5 h-3.5" />
              {label}
            </div>
            <div className="mt-2 text-2xl font-semibold text-gray-900 dark:text-zinc-50">{value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white dark:bg-dark-800 shadow-sm border border-gray-100 dark:border-dark-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 dark:text-zinc-400 border-b border-gray-100 dark:border-dark-700">
              <th className="px-4 py-2.5 font-medium">文章</th>
              <th className="px-4 py-2.5 font-medium w-24">阅读</th>
              <th className="px-4 py-2.5 font-medium w-24">点赞</th>
              <th className="px-4 py-2.5 font-medium w-24">评论</th>
            </tr>
          </thead>
          <tbody>
            {overview.posts.map((p) => (
              <tr key={p.postPath} className="border-b border-gray-50 dark:border-dark-700/50 last:border-0">
                <td className="px-4 py-2.5 text-gray-800 dark:text-zinc-200 truncate max-w-md">{p.postPath}</td>
                <td className="px-4 py-2.5 text-gray-600 dark:text-zinc-400">{p.viewCount}</td>
                <td className="px-4 py-2.5 text-gray-600 dark:text-zinc-400">{p.likeCount}</td>
                <td className="px-4 py-2.5 text-gray-600 dark:text-zinc-400">{p.commentCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!overview.posts.length && (
          <div className="py-12 text-center text-sm text-gray-400 dark:text-zinc-500">暂无数据</div>
        )}
      </div>
    </div>
  );
});
