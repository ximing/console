import { view } from '@rabjs/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { isElectron } from '../../electron/isElectron';
import { FileText, RefreshCw, Download, Trash2, Loader2 } from 'lucide-react';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [level, setLevel] = useState<string>(searchParams.get('level') || 'all');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [offset, setOffset] = useState(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const limit = 100;
  const containerRef = useRef<HTMLDivElement>(null);

  const loadLogs = async (isLoadMore = false) => {
    const api = getElectronAPI();
    if (!api?.getLogs) {
      return;
    }

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const params = {
        offset: isLoadMore ? offset : 0,
        limit,
        level: level === 'all' ? undefined : level,
        search: search || undefined,
      };
      const result = (await api.getLogs(params)) as LogResponse;
      if (result.logs) {
        if (isLoadMore) {
          setLogs((prev) => [...prev, ...result.logs]);
        } else {
          setLogs(result.logs);
        }
        setTotal(result.total);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = useCallback(() => {
    if (loadingMore || logs.length >= total) {
      return;
    }
    setOffset((prev) => prev + limit);
    loadLogs(true);
  }, [loadingMore, logs.length, total]);

  // Infinite scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        handleLoadMore();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleLoadMore]);

  useEffect(() => {
    setOffset(0);
    loadLogs();
  }, [level]);

  const handleSearch = () => {
    setOffset(0);
    // Update URL params
    const newParams = new URLSearchParams(searchParams);
    if (search) {
      newParams.set('search', search);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
    loadLogs();
  };

  const handleClear = () => {
    setShowClearConfirm(true);
  };

  const confirmClear = () => {
    setLogs([]);
    setShowClearConfirm(false);
  };

  const cancelClear = () => {
    setShowClearConfirm(false);
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

  // Highlight search keyword in text
  const highlightKeyword = (text: string, keyword: string) => {
    if (!keyword) {
      return text;
    }

    const parts = text.split(new RegExp(`(${keyword})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === keyword.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-500/30 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
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
            const newLevel = e.target.value;
            setLevel(newLevel);
            setOffset(0);
            // Update URL params
            const newParams = new URLSearchParams(searchParams);
            if (newLevel === 'all') {
              newParams.delete('level');
            } else {
              newParams.set('level', newLevel);
            }
            setSearchParams(newParams);
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

      {/* Clear Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              确认清空
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              确定要清空当前显示的日志列表吗？这不会删除实际的日志文件。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelClear}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={confirmClear}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Log List */}
      <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">加载中...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">暂无日志</div>
        ) : (
          <div
            ref={containerRef}
            className="max-h-[600px] overflow-y-auto"
          >
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
                      {highlightKeyword(log.message, search)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Loading more indicator */}
      {loadingMore && (
        <div className="mt-4 flex items-center justify-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>加载中...</span>
        </div>
      )}

      {/* All loaded */}
      {logs.length > 0 && logs.length >= total && (
        <div className="mt-4 text-center text-gray-500">
          已加载全部 {total} 条日志
        </div>
      )}
    </div>
  );
});
