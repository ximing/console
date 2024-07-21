import { useEffect, useRef } from 'react';
import { view, useService } from '@rabjs/react';
import { GithubService } from '../github.service';
import {
  X,
  File,
  Loader2,
  Download,
} from 'lucide-react';

export const EditorArea = view(() => {
  const githubService = useService(GithubService);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get active tab
  const activeTab = githubService.openTabs.find(
    (t) => t.path === githubService.activeTabPath
  );

  // Sync textarea with active tab content
  useEffect(() => {
    if (textareaRef.current && activeTab) {
      textareaRef.current.value = activeTab.content;
    }
  }, [activeTab?.path]);

  const handleTabClick = (path: string) => {
    githubService.setActiveTab(path);
  };

  const handleCloseTab = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    const tab = githubService.openTabs.find((t) => t.path === path);

    if (tab?.isDirty) {
      const confirmClose = confirm(`文件 "${path}" 有未保存的修改，确定要关闭吗？`);
      if (!confirmClose) {
        return;
      }
      githubService.forceCloseTab(path);
    } else {
      githubService.closeTab(path);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (activeTab) {
      githubService.updateFile(activeTab.path, e.target.value);
    }
  };

  // Render empty state
  if (githubService.openTabs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-dark-900 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <File className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>请从左侧选择文件</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-dark-900">
      {/* Tab Bar */}
      <div className="flex items-center bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-dark-700 overflow-x-auto">
        {githubService.openTabs.map((tab) => (
          <div
            key={tab.path}
            className={`
              flex items-center gap-2 px-3 py-2 border-r border-gray-200 dark:border-dark-700 cursor-pointer
              min-w-[120px] max-w-[200px] group
              ${tab.path === githubService.activeTabPath
                ? 'bg-gray-50 dark:bg-dark-900 border-b-2 border-b-primary-500'
                : 'hover:bg-gray-100/50 dark:hover:bg-dark-800/50'
              }
            `}
            onClick={() => handleTabClick(tab.path)}
          >
            <File className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            <span className="truncate text-sm flex-1">
              {tab.isDirty && <span className="text-primary-600 dark:text-primary-400">• </span>}
              {tab.path.split('/').pop()}
            </span>
            <button
              onClick={(e) => handleCloseTab(e, tab.path)}
              className="opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-dark-800 rounded p-0.5 transition-opacity"
              title="关闭"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-auto">
        {activeTab ? (
          activeTab.fileType === 'image' ? (
            <div className="flex items-center justify-center h-full p-8 bg-gray-50 dark:bg-dark-900">
              <img
                src={activeTab.content}
                alt={activeTab.path.split('/').pop()}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : activeTab.fileType === 'binary' ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 bg-gray-50 dark:bg-dark-900 text-gray-500 dark:text-gray-400">
              <File className="w-16 h-16 opacity-30" />
              <p className="text-sm">{activeTab.path.split('/').pop()}</p>
              {activeTab.downloadUrl && (
                <a
                  href={activeTab.downloadUrl}
                  download
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" />
                  下载文件
                </a>
              )}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={activeTab.content}
              onChange={handleContentChange}
              className="w-full h-full p-4 font-mono text-sm bg-gray-50 dark:bg-dark-900 resize-none focus:outline-none"
              spellCheck={false}
              placeholder={activeTab.isNew ? '输入文件内容...' : ''}
            />
          )
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
});
