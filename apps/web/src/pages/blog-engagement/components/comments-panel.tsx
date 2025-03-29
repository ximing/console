import { useState } from 'react';
import { view, useService } from '@rabjs/react';
import { Loader2, Trash2, Undo2 } from 'lucide-react';

import { BlogEngagementService } from '../blog-engagement.service';
import { Pager } from './pager';

const PAGE_SIZE = 20;

export const CommentsPanel = view(() => {
  const service = useService(BlogEngagementService);
  const [postPathInput, setPostPathInput] = useState(service.filterPostPath);

  const applyFilter = () => {
    service.filterPostPath = postPathInput.trim();
    void service.loadComments(1);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <input
          value={postPathInput}
          onChange={(e) => setPostPathInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilter()}
          placeholder="按文章路径筛选，如 /post/2026/xxx/"
          className="w-80 px-3 py-1.5 text-sm rounded-md bg-gray-100 dark:bg-dark-800 text-gray-900 dark:text-zinc-100 outline-none focus:ring-1 focus:ring-primary-500"
        />
        <button
          onClick={applyFilter}
          className="px-3 py-1.5 text-sm rounded-md bg-primary-600 text-white hover:bg-primary-hover transition-colors"
        >
          筛选
        </button>
        <select
          value={service.filterStatus}
          onChange={(e) => {
            service.filterStatus = e.target.value;
            void service.loadComments(1);
          }}
          className="px-2 py-1.5 text-sm rounded-md bg-gray-100 dark:bg-dark-800 text-gray-900 dark:text-zinc-100 outline-none"
        >
          <option value="">全部状态</option>
          <option value="visible">可见</option>
          <option value="deleted">已删除</option>
        </select>
      </div>

      {service.loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-2">
          {service.comments.map((c) => (
            <div
              key={c.id}
              className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-dark-800 shadow-sm border border-gray-100 dark:border-dark-700"
            >
              {c.author.avatarUrl && (
                <img src={c.author.avatarUrl} alt={c.author.login} className="w-8 h-8 rounded-full shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
                  <span className="font-medium text-gray-900 dark:text-zinc-100">
                    {c.author.name || c.author.login}
                  </span>
                  <span>@{c.author.login}</span>
                  {c.visitorStatus === 'blocked' && (
                    <span className="px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
                      已拉黑
                    </span>
                  )}
                  {c.parentId && <span>回复</span>}
                  <span>{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className={`mt-1 text-sm whitespace-pre-wrap break-words ${
                  c.status === 'deleted' ? 'text-gray-400 dark:text-zinc-500 line-through' : 'text-gray-800 dark:text-zinc-200'
                }`}>
                  {c.content}
                </p>
                <div className="mt-1 text-xs text-gray-400 dark:text-zinc-500 truncate">{c.postPath}</div>
              </div>
              <button
                onClick={() => void service.setCommentStatus(c.id, c.status === 'deleted' ? 'visible' : 'deleted')}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                title={c.status === 'deleted' ? '恢复' : '删除'}
              >
                {c.status === 'deleted' ? <Undo2 className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          ))}
          {!service.comments.length && (
            <div className="py-12 text-center text-sm text-gray-400 dark:text-zinc-500">暂无评论</div>
          )}
        </div>
      )}

      <Pager page={service.commentsPage} total={service.commentsTotal} pageSize={PAGE_SIZE}
        onChange={(p) => void service.loadComments(p)} />
    </div>
  );
});
