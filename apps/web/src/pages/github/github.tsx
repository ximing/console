import { useEffect } from 'react';
import { view, useService } from '@rabjs/react';
import { GithubService } from './github.service';
import { RepoSelector } from './components/repo-selector';
import { FileTree } from './components/file-tree';
import { EditorArea } from './components/editor-area';
import { CommitButton } from './components/commit-dialog';
import { RepoManager } from './components/repo-manager';
import { Layout } from '../../components/layout';

export const GithubPage = view(() => {
  const githubService = useService(GithubService);

  // Load repos on mount
  useEffect(() => {
    githubService.loadRepos();
  }, []);

  // Check if user has any repos
  const hasRepos = githubService.repos.length > 0;
  const showRepoManager = !githubService.selectedRepo && !hasRepos;

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800">
          <RepoSelector />
          <CommitButton />
        </div>

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {showRepoManager ? (
            <div className="flex-1 overflow-auto">
              <RepoManager />
            </div>
          ) : (
            <>
              {/* Left Sidebar - File Tree */}
              <FileTree />

              {/* Right - Editor Area */}
              <EditorArea />
            </>
          )}
        </div>
      </div>
    </Layout>
  );
});
