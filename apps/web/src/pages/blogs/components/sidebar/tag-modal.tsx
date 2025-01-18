import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { view, useService } from '@rabjs/react';
import type { TagDto } from '@x-console/dto';
import { TagService } from '../../../../services/tag.service';

interface TagModalProps {
  visible: boolean;
  tag?: TagDto | null; // If provided, we're editing; otherwise creating
  onClose: () => void;
  onSave: () => void;
}

// 8 preset colors
const PRESET_COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#ef4444', // red
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#6b7280', // gray
  '#14b8a6', // teal
];

export const TagModal = view((props: TagModalProps) => {
  const tagService = useService(TagService);

  const [name, setName] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialize form when modal opens
  useEffect(() => {
    if (props.visible) {
      if (props.tag) {
        setName(props.tag.name);
        setColor(props.tag.color);
      } else {
        setName('');
        setColor(PRESET_COLORS[0]);
      }
      setError('');
      setSaving(false);
    }
  }, [props.visible, props.tag]);

  // Validate name
  const validateName = (value: string): string => {
    const trimmed = value.trim();

    if (!trimmed) {
      return '标签名称不能为空';
    }

    if (trimmed.length < 1 || trimmed.length > 20) {
      return '标签名称长度应为 1-20 个字符';
    }

    // Check for duplicate name (excluding current tag if editing)
    if (tagService.isTagNameTaken(trimmed, props.tag?.id)) {
      return '该标签名称已存在';
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

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
  };

  const handleSave = async () => {
    const validationError = validateName(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    try {
      if (props.tag) {
        // Update existing tag
        await tagService.updateTag(props.tag.id, {
          name: name.trim(),
          color,
        });
      } else {
        // Create new tag
        await tagService.createTag({
          name: name.trim(),
          color,
        });
      }

      props.onSave();
      props.onClose();
    } catch (err) {
      console.error('Save tag error:', err);
      setError('保存失败，请重试');
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
      <div className="relative bg-white/95 dark:bg-zinc-800/95 backdrop-blur-xl rounded-xl shadow-xl w-[400px] max-w-[90vw] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-700">
          <h3 className="font-medium text-gray-900 dark:text-zinc-50">
            {props.tag ? '编辑标签' : '新建标签'}
          </h3>
          <button
            onClick={handleClose}
            disabled={saving}
            className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Name input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
              标签名称
            </label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              maxLength={20}
              placeholder="输入标签名称"
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

          {/* Color picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
              颜色
            </label>

            {/* Preset colors */}
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => handleColorChange(presetColor)}
                  disabled={saving}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === presetColor
                      ? 'ring-2 ring-offset-2 ring-green-500 dark:ring-offset-zinc-800'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: presetColor }}
                  title={presetColor}
                />
              ))}
            </div>

            {/* Custom color input */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-zinc-400">自定义:</span>
              <input
                type="color"
                value={color}
                onChange={(e) => handleColorChange(e.target.value)}
                disabled={saving}
                className="w-8 h-8 rounded cursor-pointer border-0"
              />
              <span className="text-xs text-gray-400 dark:text-zinc-500 font-mono">
                {color}
              </span>
            </div>
          </div>

          {/* Preview */}
          <div className="pt-2 border-t border-gray-100 dark:border-zinc-700">
            <span className="text-sm text-gray-500 dark:text-zinc-400">预览:</span>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 mt-2 rounded-full"
              style={{ backgroundColor: `${color}20` }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs font-medium" style={{ color }}>
                {name || '标签名称'}
              </span>
            </div>
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
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !!error}
            className="px-4 py-2 text-sm text-white bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 rounded-lg shadow-[0_2px_8px_rgba(34,197,94,0.3)] hover:-translate-y-0.5 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
});
