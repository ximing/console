import { useEffect, useRef } from 'react';
import { view, useService } from '@rabjs/react';
import { GithubService } from '../github.service';
import {
  X,
  File,
  Loader2,
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
      <div className="flex-1 flex items-center justify-center bg-background text-muted-foreground">
        <div className="text-center">
          <File className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>请从左侧选择文件</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Tab Bar */}
      <div className="flex items-center bg-card border-b border-border overflow-x-auto">
        {githubService.openTabs.map((tab) => (
          <div
            key={tab.path}
            className={`
              flex items-center gap-2 px-3 py-2 border-r border-border cursor-pointer
              min-w-[120px] max-w-[200px] group
              ${tab.path === githubService.activeTabPath
                ? 'bg-background border-b-2 border-b-primary-500'
                : 'hover:bg-muted/50'
              }
            `}
            onClick={() => handleTabClick(tab.path)}
          >
            <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate text-sm flex-1">
              {tab.isDirty && <span className="text-primary">• </span>}
              {tab.path.split('/').pop()}
            </span>
            <button
              onClick={(e) => handleCloseTab(e, tab.path)}
              className="opacity-0 group-hover:opacity-100 hover:bg-muted rounded p-0.5 transition-opacity"
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
          <textarea
            ref={textareaRef}
            value={activeTab.content}
            onChange={handleContentChange}
            className="w-full h-full p-4 font-mono text-sm bg-background resize-none focus:outline-none"
            spellCheck={false}
            placeholder={activeTab.isNew ? '输入文件内容...' : ''}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
});
