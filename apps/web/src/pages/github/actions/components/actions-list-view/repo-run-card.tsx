import { view } from '@rabjs/react';
import type { WorkflowRun } from '../../actions.service';
import { useState } from 'react';
import { ChevronDown, ChevronRight, User, GitBranch, ExternalLink } from 'lucide-react';

const statusColors: Record<string, string> = {
  completed_success: 'bg-green-500',
  completed_failure: 'bg-red-500',
  in_progress: 'bg-blue-500',
  queued: 'bg-yellow-500',
};

function getStatusColor(status: string, conclusion: string | null): string {
  if (status === 'completed' && conclusion) {
    return statusColors[`completed_${conclusion}`] || 'bg-gray-400';
  }
  return statusColors[status] || 'bg-gray-400';
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;
  return date.toLocaleDateString('zh-CN');
}

export const RepoRunCard = view(({ repoName, runs }: { repoName: string; runs: WorkflowRun[] }) => {
  const [expanded, setExpanded] = useState(false);
  const latestRun = runs[0];
  const dotColor = getStatusColor(latestRun?.status, latestRun?.conclusion);

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-700/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
          <span className="font-medium text-gray-900 dark:text-white">{repoName}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-zinc-400">
          <span>{runs.length} runs</span>
          <span>{formatRelativeTime(latestRun?.updated_at)}</span>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-100 dark:border-zinc-700">
          {runs.slice(0, 10).map((run) => (
            <a
              key={run.id}
              href={run.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-zinc-700/50 text-sm"
            >
              <span className={`w-2 h-2 rounded-full ${getStatusColor(run.status, run.conclusion)}`} />
              <span className="text-gray-700 dark:text-zinc-300">{run.workflow_name}</span>
              <span className="text-gray-400">#{run.run_number}</span>
              <span className="text-gray-400">•</span>
              <GitBranch className="w-3 h-3 text-gray-400" />
              <span className="text-gray-500">{run.head_branch}</span>
              <span className="text-gray-400">•</span>
              <User className="w-3 h-3 text-gray-400" />
              <span className="text-gray-500">{run.actor}</span>
              <span className="flex-1" />
              <span className="text-gray-400">{formatRelativeTime(run.updated_at)}</span>
              <ExternalLink className="w-3 h-3 text-gray-400" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
});