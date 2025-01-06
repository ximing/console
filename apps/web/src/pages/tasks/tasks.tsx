import { view, useService } from '@rabjs/react';
import { useEffect, useState } from 'react';
import { Layout } from '../../components/layout';
import { TaskService } from '../../services/task.service';
import { ToastService } from '../../services/toast.service';
import {
  Play,
  Pause,
  Trash2,
  Clock,
  Zap,
  Plus,
  AlertCircle,
  X,
  ChevronDown,
  Loader2,
  History,
} from 'lucide-react';
import type { TaskDto, CreateTaskDto } from '@x-console/dto';

// CRON templates
const CRON_TEMPLATES = [
  { label: '每小时', value: '0 * * * *' },
  { label: '每天凌晨', value: '0 0 * * *' },
  { label: '每天早上 9 点', value: '0 9 * * *' },
  { label: '每周一', value: '0 9 * * 1' },
  { label: '每月 1 号', value: '0 0 1 * *' },
];

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editTask?: TaskDto | null;
}

const TaskFormModal = view(({ isOpen, onClose, onSuccess, editTask }: TaskFormModalProps) => {
  const taskService = useService(TaskService);
  const toastService = useService(ToastService);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCronDropdown, setShowCronDropdown] = useState(false);
  const [showActionDropdown, setShowActionDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState<'manual' | 'scheduled'>('manual');
  const [cronExpression, setCronExpression] = useState('');
  const [actionId, setActionId] = useState('');
  const [modelId, setModelId] = useState('');
  const [actionConfig, setActionConfig] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens or editTask changes
  useEffect(() => {
    if (isOpen) {
      if (editTask) {
        setName(editTask.name);
        setTriggerType(editTask.triggerType);
        setCronExpression(editTask.cronExpression || '');
        setActionId(editTask.actionId);
        // Extract modelId from actionConfig if exists
        const config = editTask.actionConfig as Record<string, unknown> | undefined;
        setModelId((config?.modelId as string | undefined) || '');
        setActionConfig(
          editTask.actionConfig ? JSON.stringify(editTask.actionConfig, null, 2) : ''
        );
      } else {
        // Reset for new task
        setName('');
        setTriggerType('manual');
        setCronExpression('');
        setActionId('');
        setModelId('');
        setActionConfig('');
      }
      setErrors({});
    }
  }, [isOpen, editTask]);

  // Load actions and user models when modal opens
  useEffect(() => {
    if (isOpen) {
      if (taskService.availableActions.length === 0) {
        taskService.loadAvailableActions();
      }
      if (taskService.userModels.length === 0) {
        taskService.loadUserModels();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = '请输入任务名称';
    }

    if (triggerType === 'scheduled' && !cronExpression.trim()) {
      newErrors.cronExpression = '请输入 CRON 表达式';
    }

    if (!actionId) {
      newErrors.actionId = '请选择动作';
    }

    // Validate JSON for action config
    if (actionConfig.trim()) {
      try {
        JSON.parse(actionConfig);
      } catch {
        newErrors.actionConfig = '请输入有效的 JSON 格式';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // Build action config, including modelId if selected
      let parsedConfig: Record<string, unknown> = {};
      if (actionConfig.trim()) {
        parsedConfig = JSON.parse(actionConfig.trim());
      }
      if (modelId) {
        parsedConfig.modelId = modelId;
      }

      const taskData: CreateTaskDto = {
        name: name.trim(),
        triggerType,
        actionId,
        ...(triggerType === 'scheduled' && { cronExpression: cronExpression.trim() }),
        ...(Object.keys(parsedConfig).length > 0 && { actionConfig: parsedConfig }),
      };

      let success: TaskDto | null;

      if (editTask) {
        success = await taskService.updateTask(editTask.id, taskData);
        if (success) {
          toastService.success('任务更新成功');
        } else {
          toastService.error('更新任务失败');
        }
      } else {
        success = await taskService.createTask(taskData);
        if (success) {
          toastService.success('任务创建成功');
        } else {
          toastService.error('创建任务失败');
        }
      }

      if (success) {
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error('Submit task error:', err);
      toastService.error(editTask ? '更新任务失败' : '创建任务失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Select CRON template
  const selectCronTemplate = (value: string) => {
    setCronExpression(value);
    setShowCronDropdown(false);
  };

  // Get selected action
  const selectedAction = taskService.availableActions.find((a) => a.id === actionId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white/95 dark:bg-zinc-800/95 backdrop-blur-xl rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editTask ? '编辑任务' : '新建任务'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Task Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              任务名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入任务名称"
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300 dark:border-dark-600'
              }`}
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* Trigger Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              触发类型 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTriggerType('manual')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                  triggerType === 'manual'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    : 'border-gray-300 dark:border-zinc-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-700'
                }`}
              >
                <Zap className="w-4 h-4" />
                手动触发
              </button>
              <button
                type="button"
                onClick={() => setTriggerType('scheduled')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                  triggerType === 'scheduled'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    : 'border-gray-300 dark:border-zinc-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-700'
                }`}
              >
                <Clock className="w-4 h-4" />
                定时触发
              </button>
            </div>
          </div>

          {/* CRON Expression (for scheduled) */}
          {triggerType === 'scheduled' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                CRON 表达式 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cronExpression}
                  onChange={(e) => setCronExpression(e.target.value)}
                  placeholder="0 * * * *"
                  className={`w-full px-3 py-2 pr-20 border rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    errors.cronExpression
                      ? 'border-red-500'
                      : 'border-gray-300 dark:border-dark-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowCronDropdown(!showCronDropdown)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 bg-gray-100 dark:bg-dark-600 rounded transition-colors"
                >
                  模板 <ChevronDown className="w-3 h-3 inline" />
                </button>
                {showCronDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg shadow-lg overflow-hidden">
                    {CRON_TEMPLATES.map((template) => (
                      <button
                        key={template.value}
                        type="button"
                        onClick={() => selectCronTemplate(template.value)}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-600 transition-colors"
                      >
                        {template.label}
                        <span className="ml-2 text-gray-400 dark:text-gray-500 text-xs">
                          {template.value}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {errors.cronExpression && (
                <p className="mt-1 text-sm text-red-500">{errors.cronExpression}</p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                格式: 分 时 日 月 周 (例如: 0 9 * * * 表示每天早上 9 点)
              </p>
            </div>
          )}

          {/* Action Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              动作 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowActionDropdown(!showActionDropdown)}
                className={`w-full flex items-center justify-between px-3 py-2 border rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.actionId ? 'border-red-500' : 'border-gray-300 dark:border-dark-600'
                }`}
              >
                <span
                  className={selectedAction ? 'text-gray-900 dark:text-white' : 'text-gray-400'}
                >
                  {selectedAction ? selectedAction.name : '请选择动作'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {showActionDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                  {taskService.availableActions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      加载中...
                    </div>
                  ) : (
                    taskService.availableActions.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => {
                          setActionId(action.id);
                          setShowActionDropdown(false);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-600 transition-colors"
                      >
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {action.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {action.description}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {errors.actionId && <p className="mt-1 text-sm text-red-500">{errors.actionId}</p>}
          </div>

          {/* Model Selector - show when action requires model */}
          {selectedAction?.requiresModel && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                大模型 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowModelDropdown(!showModelDropdown)}
                  className="w-full flex items-center justify-between px-3 py-2 border rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 border-gray-300 dark:border-dark-600"
                >
                  <span className={modelId ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>
                    {modelId
                      ? taskService.userModels.find((m) => m.id === modelId)?.name || '请选择模型'
                      : '请选择模型'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
                {showModelDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {taskService.userModels.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                        暂无配置的模型，请在设置中添加
                      </div>
                    ) : (
                      taskService.userModels.map((model) => (
                        <button
                          key={model.id}
                          type="button"
                          onClick={() => {
                            setModelId(model.id);
                            setShowModelDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-dark-600 transition-colors"
                        >
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {model.name}
                            {model.isDefault && (
                              <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                                默认
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {model.provider} - {model.modelName}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {!modelId && <p className="mt-1 text-sm text-orange-500">请选择一个模型</p>}
            </div>
          )}

          {/* Action Config */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              动作配置 (JSON)
            </label>
            <textarea
              value={actionConfig}
              onChange={(e) => setActionConfig(e.target.value)}
              placeholder='{"url": "https://api.example.com", "method": "GET"}'
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-zinc-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm ${
                errors.actionConfig ? 'border-red-500' : 'border-gray-300 dark:border-dark-600'
              }`}
            />
            {errors.actionConfig && (
              <p className="mt-1 text-sm text-red-500">{errors.actionConfig}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              输入 JSON 格式的配置参数，具体参数取决于所选动作
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-zinc-700 hover:bg-gray-200 dark:hover:bg-zinc-600 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 rounded-lg shadow-[0_2px_8px_rgba(34,197,94,0.3)] hover:-translate-y-0.5 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {editTask ? '保存' : '创建'}
          </button>
        </div>
      </div>
    </div>
  );
});

export const TasksPage = view(() => {
  const taskService = useService(TaskService);
  const toastService = useService(ToastService);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [triggeringTaskId, setTriggeringTaskId] = useState<string | null>(null);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDto | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyTask, setHistoryTask] = useState<TaskDto | null>(null);

  // Load tasks on mount
  useEffect(() => {
    taskService.loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open form modal for new task
  const openNewTaskModal = () => {
    setEditingTask(null);
    setFormModalOpen(true);
  };

  // Open form modal for editing
  const openEditTaskModal = (task: TaskDto) => {
    setEditingTask(task);
    setFormModalOpen(true);
  };

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

  // Open execution history modal
  const openHistoryModal = (task: TaskDto) => {
    setHistoryTask(task);
    setHistoryModalOpen(true);
    taskService.loadTaskExecutions(task.id);
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
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">管理您的自动化任务</p>
            </div>
            <button
              onClick={openNewTaskModal}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white rounded-lg shadow-[0_2px_8px_rgba(34,197,94,0.3)] hover:-translate-y-0.5 transition-all duration-150"
            >
              <Plus className="w-5 h-5" />
              <span>新建任务</span>
            </button>
          </div>

          {/* Loading State */}
          {taskService.isLoading && (
            <div className="bg-white dark:bg-dark-800 rounded-xl shadow-md p-8">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 dark:bg-dark-700 rounded-lg" />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!taskService.isLoading && taskService.tasks.length === 0 && (
            <div className="bg-white dark:bg-dark-800 rounded-xl shadow-md p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-dark-700 rounded-full flex items-center justify-center">
                <Zap className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无任务</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">创建您的第一个自动化任务吧</p>
              <button
                onClick={openNewTaskModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white rounded-lg shadow-[0_2px_8px_rgba(34,197,94,0.3)] hover:-translate-y-0.5 transition-all duration-150"
              >
                <Plus className="w-5 h-5" />
                <span>新建任务</span>
              </button>
            </div>
          )}

          {/* Task List */}
          {!taskService.isLoading && taskService.tasks.length > 0 && (
            <div className="bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/80 dark:bg-zinc-700/50">
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
                        className="hover:bg-green-50/60 dark:hover:bg-green-900/15 transition-colors"
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
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
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
                                : 'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-600'
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
                              onClick={() => openHistoryModal(task)}
                              className="p-2 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50/60 dark:hover:bg-green-900/15 rounded-lg transition-colors"
                              title="执行历史"
                            >
                              <History className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEditTaskModal(task)}
                              className="p-2 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50/60 dark:hover:bg-green-900/15 rounded-lg transition-colors"
                              title="编辑任务"
                            >
                              <Zap className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleTrigger(task.id)}
                              disabled={triggeringTaskId === task.id}
                              className="p-2 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50/60 dark:hover:bg-green-900/15 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="执行任务"
                            >
                              {triggeringTaskId === task.id ? (
                                <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => openDeleteModal(task.id)}
                              className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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

      {/* Task Form Modal */}
      <TaskFormModal
        isOpen={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        onSuccess={() => taskService.loadTasks()}
        editTask={editingTask}
      />

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteModalOpen(false)} />

          {/* Modal */}
          <div className="relative bg-white/95 dark:bg-zinc-800/95 backdrop-blur-xl rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
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

      {/* Execution History Modal */}
      {historyModalOpen && historyTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setHistoryModalOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-white/95 dark:bg-zinc-800/95 backdrop-blur-xl rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">执行历史</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{historyTask.name}</p>
              </div>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {taskService.isLoadingExecutions ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-20 bg-gray-100 dark:bg-dark-700 rounded-lg animate-pulse"
                    />
                  ))}
                </div>
              ) : taskService.executions.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">暂无执行记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {taskService.executions.map((execution) => (
                    <div
                      key={execution.id}
                      className="p-4 bg-gray-50 dark:bg-dark-700/50 rounded-lg shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            execution.status === 'success'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          }`}
                        >
                          {execution.status === 'success' ? '成功' : '失败'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {execution.startedAt
                            ? new Date(execution.startedAt).toLocaleString('zh-CN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })
                            : '-'}
                        </span>
                      </div>
                      {execution.finishedAt && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          耗时:{' '}
                          {Math.round(
                            (new Date(execution.finishedAt).getTime() -
                              new Date(execution.startedAt).getTime()) /
                              1000
                          )}
                          s
                        </p>
                      )}
                      {execution.errorMessage && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-600 dark:text-red-400">
                          {execution.errorMessage}
                        </div>
                      )}
                      {execution.result !== undefined && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">结果:</p>
                          <pre className="text-xs bg-gray-100 dark:bg-dark-600 p-2 rounded overflow-x-auto text-gray-700 dark:text-gray-300">
                            {JSON.stringify(execution.result as object, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between items-center px-6 py-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                共 {taskService.executionsTotal} 条执行记录
              </p>
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-lg transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
});
