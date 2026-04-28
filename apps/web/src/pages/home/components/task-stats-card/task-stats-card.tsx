import { view, useService } from '@rabjs/react';
import { useNavigate } from 'react-router';
import { useMemo, useEffect } from 'react';
import { ListTodo, CheckCircle } from 'lucide-react';
import { TaskService } from '../../../../services/task.service';

interface TaskStatsCardProps {
  className?: string;
}

export const TaskStatsCard = view<TaskStatsCardProps>((props) => {
  const taskService = useService(TaskService);
  const navigate = useNavigate();

  // Load tasks on mount
  useEffect(() => {
    taskService.loadTasks();
  }, [taskService]);

  const tasks = taskService.tasks;
  const isLoading = taskService.isLoading;

  // Count tasks by enabled status using useMemo for performance
  // Note: TaskDto doesn't have status field, only enabled (boolean)
  const total = useMemo(() => tasks.length, [tasks]);
  const enabled = useMemo(() => tasks.filter((task) => task.enabled).length, [tasks]);

  const handleStatClick = () => {
    navigate('/tasks');
  };

  if (isLoading) {
    return (
      <div
        className={`bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4 ${props.className || ''}`}
      >
        <div className="flex items-center justify-center h-24 text-gray-500 dark:text-gray-400">
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-xl shadow-sm p-4 ${props.className || ''}`}
    >
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">任务概览</h3>
      <div className="grid grid-cols-2 gap-4">
        {/* Total */}
        <button
          onClick={handleStatClick}
          aria-label={`总计: ${total}个`}
          className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/15 transition-all duration-150"
        >
          <ListTodo className="w-6 h-6 text-green-500" />
          <span className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {total}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            总计
          </span>
        </button>

        {/* Enabled */}
        <button
          onClick={handleStatClick}
          aria-label={`已启用: ${enabled}个`}
          className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/15 transition-all duration-150"
        >
          <CheckCircle className="w-6 h-6 text-blue-500" />
          <span className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {enabled}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">已启用</span>
        </button>
      </div>
    </div>
  );
});
