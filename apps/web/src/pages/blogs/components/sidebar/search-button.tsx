import { Search } from 'lucide-react';
import { view } from '@rabjs/react';

interface SearchButtonProps {
  onClick: () => void;
}

export const SearchButton = view(({ onClick }: SearchButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
    >
      <Search className="w-4 h-4" />
      <span>搜索</span>
    </button>
  );
});
