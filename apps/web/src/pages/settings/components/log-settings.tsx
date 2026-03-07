import { view } from '@rabjs/react';
import { useState, useEffect } from 'react';
import { isElectron } from '../../electron/isElectron';
import { FileText, RefreshCw, Download, Trash2 } from 'lucide-react';

// Types for log entries
interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  projectName?: string;
  [key: string]: unknown;
}

interface LogResponse {
  logs: LogEntry[];
  total: number;
  error?: string;
}

interface LogCountResponse {
  count: number;
  error?: string;
}

// Get electron API if available
function getElectronAPI() {
  if (!isElectron() || !window.electronAPI) {
    return null;
  }
  return window.electronAPI;
}

export const LogSettings = view(() => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 100;

  const loadLogs = async () => {
    const api = getElectronAPI();
    if (!api?.getLogs) {
      return;
    }

    setLoading(true);
    try {
      const params = {
        offset,
        limit,
        level: level === 'all' ? undefined : level,
        search: search || undefined,
      };
      const result = (await api.getLogs(params)) as LogResponse;
      if (result.logs) {
        setLogs(result.logs);
        setTotal(result.total);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [level, offset]);

  const handleSearch = () => {
    setOffset(0);
    loadLogs();
  };

  const handleClear = () => {
    setLogs([]);
  };

  const handleExport = async () => {
    const api = getElectronAPI();
    if (!api?.getLogs) {
      return;
    }

    try {
      const result = (await api.getLogs({ offset: 0, limit: 10000 })) as LogResponse;
      const logText = result.logs
        .map((log) => `[${log.timestamp}] [${log.level}] ${log.message}`)
        .join('\n');

      const blob = new Blob([logText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `console-logs-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export logs:', error);
    }
  };

  const getLevelColor = (logLevel: string) => {
    switch (logLevel.toLowerCase()) {
      case 'error':
        return 'text-red-500';
      case 'warn':
      case 'warning':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-500';
      case 'debug':
        return 'text-gray-500';
      case 'silly':
      case 'verbose':
        return 'text-gray-400';
      default:
        return 'text-gray-700';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">日志</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          共 {total} 条日志
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Level Filter */}
        <select
          value={level}
          onChange={(e) => {
            setLevel(e.target.value);
            setOffset(0);
          }}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800 text-gray-900 dark:text-white"
        >
          <option value="all">全部级别</option>
          <option value="error">Error</option>
          <option value="warn">Warn</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
        </select>

        {/* Search */}
        <div className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索日志内容..."
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-800 text-gray-900 dark:text-white w-64"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            搜索
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={loadLogs}
            className="p-2 rounded-lg border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700"
            title="刷新"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleExport}
            className="p-2 rounded-lg border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700"
            title="导出"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={handleClear}
            className="p-2 rounded-lg border border-gray-300 dark:border-dark-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700"
            title="清空"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Log List */}
      <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">暂无日志</div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark-700 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    时间
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    级别
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    内容
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-dark-700">
                {logs.map((log, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-dark-700">
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 font-mono">
                      {log.timestamp}
                    </td>
                    <td className={`px-4 py-3 text-sm font-medium font-mono ${getLevelColor(log.level)}`}>
                      {log.level}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-mono whitespace-pre-wrap break-all">
                      {log.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Load More */}
      {logs.length > 0 && logs.length < total && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setOffset(offset + limit)}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            加载更多
          </button>
        </div>
      )}
    </div>
  );
});
