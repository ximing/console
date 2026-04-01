import { X, Upload, AlertCircle, CheckCircle } from 'lucide-react';

interface MediaUploadModalProps {
  filename: string;
  progress: number; // 0-100
  status: 'uploading' | 'success' | 'error';
  error?: string;
  onClose: () => void;
}

export function MediaUploadModal({
  filename,
  progress,
  status,
  error,
  onClose,
}: MediaUploadModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl w-[400px] max-w-[90vw] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-zinc-700">
          <h3 className="font-medium text-gray-900 dark:text-zinc-50">
            {status === 'uploading' && '上传中'}
            {status === 'success' && '上传成功'}
            {status === 'error' && '上传失败'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Filename */}
          <div className="flex items-center gap-2 mb-3">
            <Upload className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
            <span className="text-sm text-gray-700 dark:text-zinc-300 truncate">
              {filename}
            </span>
          </div>

          {/* Progress bar */}
          {status === 'uploading' && (
            <>
              <div className="h-2 bg-gray-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-2 text-sm text-gray-500 dark:text-zinc-400 text-right">
                {progress}%
              </div>
            </>
          )}

          {/* Success state */}
          {status === 'success' && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span>上传完成</span>
            </div>
          )}

          {/* Error state */}
          {status === 'error' && (
            <div className="flex items-start gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error || '上传失败，请重试'}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
