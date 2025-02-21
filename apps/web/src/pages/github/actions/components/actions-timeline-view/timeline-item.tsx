import { view } from '@rabjs/react';
import type { WorkflowRun } from '../../actions.service';
import { Github, Clock, User, GitBranch, ExternalLink } from 'lucide-react';

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

export const TimelineItem = view(({ run }: { run: WorkflowRun }) => {
  const dotColor = getStatusColor(run.status, run.conclusion);

  return (
    <div className="flex gap-4 p-4 bg-white dark:bg-zinc-800 rounded-lg shadow-sm hover:-translate-y-0.5 transition-all duration-150">
      <div className="flex-shrink-0 mt-1">
        <span className={`w-3 h-3 rounded-full ${dotColor} block`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <Github className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {run.repository_full_name}
          </span>
          <span className="text-sm text-gray-500">/</span>
          <span className="text-sm text-gray-700 dark:text-zinc-300">{run.workflow_name}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-zinc-400 flex-wrap">
          <span>#{run.run_number}</span>
          <span>•</span>
          <GitBranch className="w-3 h-3" />
          <span>{run.head_branch}</span>
          <span>•</span>
          <User className="w-3 h-3" />
          <span>{run.actor}</span>
          <span>•</span>
          <Clock className="w-3 h-3" />
          <span>{formatRelativeTime(run.updated_at)}</span>
        </div>
      </div>
      <a
        href={run.html_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
});