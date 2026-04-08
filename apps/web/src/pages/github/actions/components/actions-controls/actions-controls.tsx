import { view, useService } from '@rabjs/react';
import { ActionsService } from '../../actions.service';
import type { StatusFilter } from '../../actions.service';
import { List, Clock, RefreshCw } from 'lucide-react';

const POLL_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '30s', value: 30000 },
  { label: '1min', value: 60000 },
  { label: '5min', value: 300000 },
];

const FILTER_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Success', value: 'success' },
  { label: 'Failure', value: 'failure' },
  { label: 'Running', value: 'running' },
];

export const ActionsControls = view(() => {
  const actionsService = useService(ActionsService);

  const handleRefresh = () => {
    actionsService.loadRuns();
  };

  const handlePollChange = (value: number) => {
    actionsService.stopPolling();
    if (value > 0) {
      actionsService.startPolling(value);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-800 rounded-lg px-4 py-3 shadow-sm">
      {/* View Mode Toggle */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-700 rounded-lg p-1">
        <button
          onClick={() => actionsService.setViewMode('list')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
            actionsService.viewMode === 'list'
              ? 'bg-white dark:bg-zinc-600 text-green-600 shadow-sm'
              : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'
          }`}
        >
          <List className="w-4 h-4" />
          列表
        </button>
        <button
          onClick={() => actionsService.setViewMode('timeline')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
            actionsService.viewMode === 'timeline'
              ? 'bg-white dark:bg-zinc-600 text-green-600 shadow-sm'
              : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          时间线
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => actionsService.setFilter(opt.value)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              actionsService.filter === opt.value
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium'
                : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Polling Controls */}
      <div className="flex items-center gap-2">
        <select
          value={actionsService.pollInterval}
          onChange={(e) => handlePollChange(Number(e.target.value))}
          className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-zinc-700 border-none rounded-lg focus:ring-2 focus:ring-green-500 cursor-pointer"
        >
          {POLL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button
          onClick={handleRefresh}
          disabled={actionsService.isLoading}
          className="p-2 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${actionsService.isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
});