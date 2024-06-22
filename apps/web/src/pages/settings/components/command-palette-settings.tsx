import { view, useService } from '@rabjs/react';
import { useEffect, useState } from 'react';
import { UserModelService } from '../../../services/user-model.service';
import { ToastService } from '../../../services/toast.service';
import { Command, Bot } from 'lucide-react';
import type { UserModelDto } from '@x-console/dto';

const STORAGE_KEY = 'command-palette-model-id';

export const CommandPaletteSettings = view(() => {
  const modelService = useService(UserModelService);
  const toastService = useService(ToastService);

  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load models and saved preference
  useEffect(() => {
    modelService.loadModels();
    // Load saved model preference from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setSelectedModelId(saved);
    }
    setIsLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Get available models (only AI models)
  const availableModels = modelService.models;

  // Handle model selection change
  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
    localStorage.setItem(STORAGE_KEY, modelId);
    if (modelId) {
      const model = availableModels.find((m) => m.id === modelId);
      toastService.success(`已选择模型: ${model?.name || modelId}`);
    } else {
      toastService.success('已使用默认模型');
    }
  };

  // Get the selected model
  const selectedModel = availableModels.find((m) => m.id === selectedModelId);

  // Helper to get provider display name
  const getProviderName = (provider: string) => {
    const names: Record<string, string> = {
      openai: 'OpenAI',
      deepseek: 'DeepSeek',
      openrouter: 'OpenRouter',
      other: '其他 (OpenAI 兼容)',
    };
    return names[provider] || provider;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">命令面板设置</h2>
          <p className="text-gray-600 dark:text-gray-400">
            配置命令面板使用的 AI 模型
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
            <Command className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-1">
              命令面板
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              命令面板是一个快速工具栏，通过 Option+Space (macOS) 或 Alt+Space (Windows/Linux) 快捷键唤起。
              您可以选择 AI 模型来路由和执行工具。
            </p>
          </div>
        </div>
      </div>

      {/* Model Selection */}
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-dark-700 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bot className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">AI 模型</h3>
        </div>

        {/* Loading State */}
        {modelService.isLoading && !isLoaded && (
          <div className="animate-pulse h-10 bg-gray-200 dark:bg-dark-700 rounded-lg" />
        )}

        {/* No Models */}
        {!modelService.isLoading && isLoaded && availableModels.length === 0 && (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">
              暂无可用模型
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              请先在
              <a
                href="/settings/models"
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mx-1"
              >
                大模型设置
              </a>
              中添加模型
            </p>
          </div>
        )}

        {/* Model Options */}
        {!modelService.isLoading && isLoaded && availableModels.length > 0 && (
          <div className="space-y-3">
            {/* Default Option */}
            <label
              className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedModelId === ''
                  ? 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-dark-700 hover:border-gray-300 dark:hover:border-dark-600'
              }`}
            >
              <input
                type="radio"
                name="model"
                value=""
                checked={selectedModelId === ''}
                onChange={(e) => handleModelChange(e.target.value)}
                className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">
                  使用默认模型 (系统配置)
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  使用服务端配置的默认模型
                </div>
              </div>
            </label>

            {/* Model Options */}
            {availableModels.map((model) => (
              <label
                key={model.id}
                className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedModelId === model.id
                    ? 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-dark-700 hover:border-gray-300 dark:hover:border-dark-600'
                }`}
              >
                <input
                  type="radio"
                  name="model"
                  value={model.id}
                  checked={selectedModelId === model.id}
                  onChange={(e) => handleModelChange(e.target.value)}
                  className="w-4 h-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {model.name}
                    </span>
                    {model.isDefault && (
                      <span className="inline-flex items-center px-2 py-0.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-medium rounded-full">
                        默认
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {getProviderName(model.provider)} • {model.modelName}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
