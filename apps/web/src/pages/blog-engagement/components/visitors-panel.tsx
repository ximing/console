import { view, useService } from '@rabjs/react';
import { Ban, CircleCheck, Loader2 } from 'lucide-react';

import { BlogEngagementService } from '../blog-engagement.service';
import { Pager } from './pager';

const PAGE_SIZE = 20;

export const VisitorsPanel = view(() => {
  const service = useService(BlogEngagementService);

  return (
    <div>
      {service.loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="rounded-xl bg-white dark:bg-dark-800 shadow-sm border border-gray-100 dark:border-dark-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 dark:text-zinc-400 border-b border-gray-100 dark:border-dark-700">
                <th className="px-4 py-2.5 font-medium">访客</th>
                <th className="px-4 py-2.5 font-medium w-24">评论数</th>
                <th className="px-4 py-2.5 font-medium w-44">最近登录</th>
                <th className="px-4 py-2.5 font-medium w-24">状态</th>
                <th className="px-4 py-2.5 font-medium w-20">操作</th>
              </tr>
            </thead>
            <tbody>
              {service.visitors.map((v) => (
                <tr key={v.id} className="border-b border-gray-50 dark:border-dark-700/50 last:border-0">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      {v.avatarUrl && <img src={v.avatarUrl} alt={v.login} className="w-7 h-7 rounded-full" />}
                      <div>
                        <div className="text-gray-900 dark:text-zinc-100">{v.name || v.login}</div>
                        <div className="text-xs text-gray-400 dark:text-zinc-500">@{v.login}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-zinc-400">{v.commentCount ?? 0}</td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-zinc-400">
                    {new Date(v.lastLoginAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded text-xs ${
                      v.status === 'blocked'
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                    }`}>
                      {v.status === 'blocked' ? '已拉黑' : '正常'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => void service.setVisitorStatus(v.id, v.status === 'blocked' ? 'active' : 'blocked')}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                      title={v.status === 'blocked' ? '解封' : '拉黑'}
                    >
                      {v.status === 'blocked' ? <CircleCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!service.visitors.length && (
            <div className="py-12 text-center text-sm text-gray-400 dark:text-zinc-500">暂无访客</div>
          )}
        </div>
      )}
      <Pager page={service.visitorsPage} total={service.visitorsTotal} pageSize={PAGE_SIZE}
        onChange={(p) => void service.loadVisitors(p)} />
    </div>
  );
});
