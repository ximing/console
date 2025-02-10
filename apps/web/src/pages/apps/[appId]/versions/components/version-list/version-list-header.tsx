import { view } from '@rabjs/react';
import { ArrowLeft, Plus } from 'lucide-react';

interface VersionListHeaderProps {
  appName: string;
  onBack: () => void;
  onCreateVersion: () => void;
}

export const VersionListHeader = view((props: VersionListHeaderProps) => {
  return (
    <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-zinc-800/60">
      <div className="flex items-center gap-3">
        <button
          onClick={props.onBack}
          className="p-2 hover:bg-gray-100/80 dark:hover:bg-zinc-800/60 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-zinc-400" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-50/90">
          {props.appName}
        </h2>
        <span className="text-sm text-gray-500 dark:text-zinc-500">Versions</span>
      </div>
      <button
        type="button"
        onClick={props.onCreateVersion}
        className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 rounded-lg shadow-[0_2px_8px_rgba(34,197,94,0.3)] hover:-translate-y-0.5 transition-all duration-150"
      >
        <Plus className="w-4 h-4" />
        New Version
      </button>
    </div>
  );
});
