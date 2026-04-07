import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { view } from '@rabjs/react';
import type { AppVersionDto, CreateVersionDto, UpdateVersionDto } from '@x-console/dto';

interface VersionModalProps {
  visible: boolean;
  version?: AppVersionDto | null;
  onClose: () => void;
  onSave: (data: CreateVersionDto | UpdateVersionDto) => Promise<void>;
}

export const VersionModal = view((props: VersionModalProps) => {
  const [version, setVersion] = useState('');
  const [buildNumber, setBuildNumber] = useState('');
  const [changelog, setChangelog] = useState('');
  const [androidUrl, setAndroidUrl] = useState('');
  const [iosUrl, setIosUrl] = useState('');
  const [isLatest, setIsLatest] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Initialize form when modal opens
  useEffect(() => {
    if (props.visible) {
      if (props.version) {
        setVersion(props.version.version);
        setBuildNumber(props.version.buildNumber);
        setChangelog(props.version.changelog || '');
        setAndroidUrl(props.version.androidUrl || '');
        setIosUrl(props.version.iosUrl || '');
        setIsLatest(props.version.isLatest);
      } else {
        setVersion('');
        setBuildNumber('');
        setChangelog('');
        setAndroidUrl('');
        setIosUrl('');
        setIsLatest(false);
      }
      setError('');
      setSaving(false);
    }
  }, [props.visible, props.version]);

  const validateForm = (): string => {
    if (!version.trim()) {
      return 'Version number is required';
    }
    if (!buildNumber.trim()) {
      return 'Build number is required';
    }
    // Basic semver validation
    const semverRegex = /^\d+\.\d+\.\d+$/;
    if (!semverRegex.test(version.trim())) {
      return 'Version should be in semver format (e.g., 1.0.0)';
    }
    return '';
  };

  const handleVersionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVersion(e.target.value);
    if (error) setError('');
  };

  const handleBuildNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBuildNumber(e.target.value);
    if (error) setError('');
  };

  const handleChangelogChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setChangelog(e.target.value);
  };

  const handleAndroidUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAndroidUrl(e.target.value);
  };

  const handleIosUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIosUrl(e.target.value);
  };

  const handleIsLatestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsLatest(e.target.checked);
  };

  const handleSave = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    try {
      const data: CreateVersionDto | UpdateVersionDto = {
        version: version.trim(),
        buildNumber: buildNumber.trim(),
        changelog: changelog.trim() || undefined,
        androidUrl: androidUrl.trim() || undefined,
        iosUrl: iosUrl.trim() || undefined,
        isLatest,
      };

      await props.onSave(data);
      props.onClose();
    } catch (err) {
      console.error('Save version error:', err);
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
      <div className="relative bg-white/95 dark:bg-zinc-800/95 backdrop-blur-xl rounded-xl shadow-xl w-[500px] max-w-[90vw] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-zinc-700">
          <h3 className="font-medium text-gray-900 dark:text-zinc-50">
            {props.version ? 'Edit Version' : 'Create New Version'}
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
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Version and Build Number row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
                Version <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={version}
                onChange={handleVersionChange}
                placeholder="1.0.0"
                disabled={saving}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-50 placeholder:text-gray-400 outline-none transition-all focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
                Build Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={buildNumber}
                onChange={handleBuildNumberChange}
                placeholder="1"
                disabled={saving}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-50 placeholder:text-gray-400 outline-none transition-all focus:border-green-500"
              />
            </div>
          </div>

          {/* Changelog */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
              Changelog
            </label>
            <textarea
              value={changelog}
              onChange={handleChangelogChange}
              placeholder="What's new in this version..."
              disabled={saving}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-50 placeholder:text-gray-400 outline-none transition-all focus:border-green-500 resize-none"
            />
          </div>

          {/* Android URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
              Android Download URL
            </label>
            <input
              type="url"
              value={androidUrl}
              onChange={handleAndroidUrlChange}
              placeholder="https://..."
              disabled={saving}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-50 placeholder:text-gray-400 outline-none transition-all focus:border-green-500"
            />
          </div>

          {/* iOS URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
              iOS Download URL
            </label>
            <input
              type="url"
              value={iosUrl}
              onChange={handleIosUrlChange}
              placeholder="https://..."
              disabled={saving}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-50 placeholder:text-gray-400 outline-none transition-all focus:border-green-500"
            />
          </div>

          {/* Is Latest checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isLatest"
              checked={isLatest}
              onChange={handleIsLatestChange}
              disabled={saving}
              className="w-4 h-4 rounded border-gray-300 dark:border-zinc-600 text-green-600 dark:text-green-400 focus:ring-green-500"
            />
            <label htmlFor="isLatest" className="text-sm text-gray-700 dark:text-zinc-300">
              Mark as latest version
            </label>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
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
