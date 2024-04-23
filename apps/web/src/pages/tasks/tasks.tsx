import { view, useService } from '@rabjs/react';
import { useEffect, useState } from 'react';
import { Layout } from '../../components/layout';
import { TaskService } from '../../services/task.service';
import { ToastService } from '../../services/toast.service';
import { Play, Pause, Trash2, Clock, Zap, Plus, AlertCircle } from 'lucide-react';

export const TasksPage = view(() => {
  const taskService = useService(TaskService);
  const toastService = useService(ToastService);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [triggeringTaskId, setTriggeringTaskId] = useState<string | null>(null);

  // Load tasks on mount
  useEffect(() => {
    taskService.loadTasks();
  }, []);

  // Handle toggle task
  const handleToggle = async (taskId: string) => {
    const result = await taskService.toggleTask(taskId);
    if (result) {
      toastService.success(result.enabled ? 'Task enabled' : 'Task disabled');
    } else {
      toastService.error('Failed to toggle task');
    }
  };

  // Handle trigger task
  const handleTrigger = async (taskId: string) => {
    setTriggeringTaskId(taskId);
    const result = await taskService.triggerTask(taskId);
    setTriggeringTaskId(null);

    if (result.success) {
      toastService.success(result.message);
    } else {
      toastService.error(result.message);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!taskToDelete) return;

    const success = await taskService.deleteTask(taskToDelete);
    if (success) {
      toastService.success('Task deleted');
    } else {
      toastService.error('Failed to delete task');
    }

    setDeleteModalOpen(false);
    setTaskToDelete(null);
  };

  // Open delete modal
  const openDeleteModal = (taskId: string) => {
    setTaskToDelete(taskId);
    setDeleteModalOpen(true);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get trigger type label
  const getTriggerTypeLabel = (triggerType: string) => {
    return triggerType === 'scheduled' ? '定时' : '手动';
  };

  return (
    <Layout>
      <div className="flex-1 bg-gray-50 dark:bg-dark-900 p-6 overflow-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">任务编排</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                管理您的自动化任务
              </p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors">
              <Plus className="w-5 h-5" />
              <span>新建任务</span>
            </button>
          </div>

          {/* Loading State */}
          {taskService.isLoading && (
            <div className="bg-white dark:bg-dark-800 rounded-xl shadow-md p-8 border border-gray-200 dark:border-dark-700">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 dark:bg-dark-700 rounded-lg" />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!taskService.isLoading && taskService.tasks.length === 0 && (
            <div className="bg-white dark:bg-dark-800 rounded-xl shadow-md p-12 border border-gray-200 dark:border-dark-700 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-dark-700 rounded-full flex items-center justify-center">
                <Zap className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                暂无任务
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                创建您的第一个自动化任务吧
              </p>
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors">
                <Plus className="w-5 h-5" />
                <span>新建任务</span>
              </button>
            </div>
          )}

          {/* Task List */}
          {!taskService.isLoading && taskService.tasks.length > 0 && (
            <div className="bg-white dark:bg-dark-800 rounded-xl shadow-md border border-gray-200 dark:border-dark-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-dark-700/50 border-b border-gray-200 dark:border-dark-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        任务名称
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        触发类型
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        动作
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        创建时间
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-dark-700">
                    {taskService.tasks.map((task) => (
                      <tr
                        key={task.id}
                        className="hover:bg-gray-50 dark:hover:bg-dark-700/30 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {task.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                              task.triggerType === 'scheduled'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                            }`}
                          >
                            {task.triggerType === 'scheduled' ? (
                              <Clock className="w-3 h-3" />
                            ) : (
                              <Zap className="w-3 h-3" />
                            )}
                            {getTriggerTypeLabel(task.triggerType)}
                          </span>
                          {task.triggerType === 'scheduled' && task.cronExpression && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {task.cronExpression}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {task.actionId}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleToggle(task.id)}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full transition-colors ${
                              task.enabled
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                                : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600'
                            }`}
                          >
                            {task.enabled ? (
                              <>
                                <Play className="w-3 h-3" />
                                已启用
                              </>
                            ) : (
                              <>
                                <Pause className="w-3 h-3" />
                                已禁用
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(task.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleTrigger(task.id)}
                              disabled={triggeringTaskId === task.id}
                              className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="执行任务"
                            >
                              {triggeringTaskId === task.id ? (
                                <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => openDeleteModal(task.id)}
                              className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                              title="删除任务"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDeleteModalOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-white dark:bg-dark-800 rounded-xl shadow-xl p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-dark-700">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  确认删除任务
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  此操作将永久删除该任务及其所有执行记录。此操作无法撤销。
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
});
