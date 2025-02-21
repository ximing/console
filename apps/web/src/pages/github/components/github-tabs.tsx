import { view } from '@rabjs/react';
import { useNavigate, useLocation } from 'react-router';

export const GithubTabs = view(() => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActions = location.pathname.includes('/actions');

  return (
    <div className="flex items-center border-b border-gray-200 dark:border-zinc-700 px-4">
      <button
        onClick={() => navigate('/github')}
        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
          !isActions
            ? 'text-green-600 border-green-500'
            : 'text-gray-600 dark:text-zinc-400 border-transparent hover:text-gray-900 dark:hover:text-zinc-200'
        }`}
      >
        Code
      </button>
      <button
        onClick={() => navigate('/github/actions')}
        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
          isActions
            ? 'text-green-600 border-green-500'
            : 'text-gray-600 dark:text-zinc-400 border-transparent hover:text-gray-900 dark:hover:text-zinc-200'
        }`}
      >
        Actions
      </button>
    </div>
  );
});