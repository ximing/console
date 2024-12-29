import { Search } from 'lucide-react';
import { view } from '@rabjs/react';

interface SearchButtonProps {
  onClick: () => void;
}

export const SearchButton = view(({ onClick }: SearchButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-500 dark:text-zinc-400 hover:bg-green-50/80 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 rounded-lg transition-all duration-150"
    >
      <Search className="w-4 h-4" />
      <span className="font-medium">搜索</span>
    </button>
  );
});
