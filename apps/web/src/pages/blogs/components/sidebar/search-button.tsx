import { Search } from 'lucide-react';
import { view } from '@rabjs/react';

interface SearchButtonProps {
  onClick: () => void;
}

export const SearchButton = view(({ onClick }: SearchButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-500 dark:text-zinc-400 hover:bg-gray-100/80 dark:hover:bg-zinc-800/50 hover:text-gray-900 dark:hover:text-zinc-200 rounded-lg transition-all duration-150"
    >
      <Search className="w-4 h-4" />
      <span className="font-medium">搜索</span>
    </button>
  );
});
