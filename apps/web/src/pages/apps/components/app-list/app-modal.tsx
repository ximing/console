import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { view } from '@rabjs/react';
import type { AppDto, CreateAppDto, UpdateAppDto } from '@x-console/dto';

interface AppModalProps {
  visible: boolean;
  app?: AppDto | null;
  onClose: () => void;
  onSave: (data: CreateAppDto | UpdateAppDto) => Promise<void>;
}

export const AppModal = view((props: AppModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialize form when modal opens
  useEffect(() => {
    if (props.visible) {
      if (props.app) {
        setName(props.app.name);
        setDescription(props.app.description || '');
      } else {
        setName('');
        setDescription('');
      }
      setError('');
      setSaving(false);
    }
  }, [props.visible, props.app]);

  const validateName = (value: string): string => {
    const trimmed = value.trim();

    if (!trimmed) {
      return 'App name is required';
    }

    if (trimmed.length < 1 || trimmed.length > 100) {
      return 'App name should be 1-100 characters';
    }

    return '';
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);

    // Clear error on change
    if (error) {
      setError('');
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
  };

  const handleSave = async () => {
    const validationError = validateName(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    try {
      const data: CreateAppDto | UpdateAppDto = {
        name: name.trim(),
        description: description.trim() || undefined,
      };

      await props.onSave(data);
      props.onClose();
    } catch (err) {
      console.error('Save app error:', err);
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      props.onClose();
    }
  };

  if (!props.visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white/95 dark:bg-zinc-800/95 backdrop-blur-xl rounded-xl shadow-xl w-[450px] max-w-[90vw] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-700">
          <h3 className="font-medium text-gray-900 dark:text-zinc-50">
            {props.app ? 'Edit App' : 'Create New App'}
          </h3>
          <button
            onClick={handleClose}
            disabled={saving}
            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded disabled:opacity-50 transition-all"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Name input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
              App Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              maxLength={100}
              placeholder="Enter app name"
              disabled={saving}
              className={`w-full px-3 py-2 text-sm rounded-lg border bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-50 placeholder:text-gray-400 outline-none transition-all ${
                error
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray-200 dark:border-zinc-700 focus:border-green-500'
              }`}
            />
            {error && (
              <p className="mt-1 text-xs text-red-500">{error}</p>
            )}
          </div>

          {/* Description input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={handleDescriptionChange}
              maxLength={500}
              placeholder="Enter app description (optional)"
              disabled={saving}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-50 placeholder:text-gray-400 outline-none transition-all focus:border-green-500 resize-none"
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">
              {description.length}/500 characters
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100 dark:border-zinc-700 bg-gray-50/50 dark:bg-zinc-800/50">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="px-4 py-2 text-sm text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-lg transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !!error}
            className="px-4 py-2 text-sm text-white bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 rounded-lg shadow-[0_2px_8px_rgba(34,197,94,0.3)] hover:-translate-y-0.5 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
});
