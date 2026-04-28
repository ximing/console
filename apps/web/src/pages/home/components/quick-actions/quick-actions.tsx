import { view } from '@rabjs/react';
import { useNavigate } from 'react-router';
import { Plus, Bell, ListTodo, ArrowRight } from 'lucide-react';

const actions = [
  {
    icon: Plus,
    label: '新建任务',
    description: '创建新任务',
    path: '/tasks/new',
  },
  {
    icon: Bell,
    label: '查看全部通知',
    description: '查看所有通知',
    path: '/notifications',
  },
  {
    icon: ListTodo,
    label: '前往任务中心',
    description: '管理所有任务',
    path: '/tasks',
  },
] as const;

export const QuickActions = view(() => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            type="button"
            key={action.path}
            onClick={() => navigate(action.path)}
            className="flex flex-row items-center gap-3 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4 transition-all duration-150 hover:bg-green-50 dark:hover:bg-green-900/15 hover:-translate-y-0.5"
          >
            <Icon className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0" />
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {action.label}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {action.description}
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 ml-auto shrink-0" />
          </button>
        );
      })}
    </div>
  );
});
