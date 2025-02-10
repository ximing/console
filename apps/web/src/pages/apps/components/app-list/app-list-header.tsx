import { view } from '@rabjs/react';
import { Plus } from 'lucide-react';

interface AppListHeaderProps {
  onCreateApp: () => void;
}

export const AppListHeader = view((props: AppListHeaderProps) => {
  return (
    <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100 dark:border-zinc-800/60">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-50/90">Apps</h2>
      </div>
      <button
        type="button"
        onClick={props.onCreateApp}
        className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 rounded-lg shadow-[0_2px_8px_rgba(34,197,94,0.3)] hover:-translate-y-0.5 transition-all duration-150"
      >
        <Plus className="w-4 h-4" />
        New App
      </button>
    </div>
  );
});
