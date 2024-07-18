import { useState } from 'react';
import { view, useService } from '@rabjs/react';
import { GithubService } from '../github.service';
import { Github } from 'lucide-react';
import { Select } from '../../../components/select';
import type { SelectOption } from '../../../components/select';
import { RepoManager } from './repo-manager';

export const RepoSelector = view(() => {
  const githubService = useService(GithubService);
  const [isManaging, setIsManaging] = useState(false);

  const repoOptions: SelectOption[] = githubService.repos.map((repo) => ({
    value: repo.id,
    label: repo.name,
  }));

  const branchOptions: SelectOption[] = githubService.branches.map((branch) => ({
    value: branch.name,
    label: branch.protected ? `${branch.name} (protected)` : branch.name,
  }));

  const handleRepoChange = async (repoId: string) => {
    if (!repoId) return;
    const repo = githubService.repos.find((r) => r.id === repoId);
    if (repo) {
      await githubService.selectRepo(repo);
    }
  };

  const handleBranchChange = async (branch: string) => {
    if (!branch) return;
    await githubService.selectBranch(branch);
  };

  const handleManageClose = async () => {
    setIsManaging(false);
    // Refresh repo list in case repos were added/edited/deleted
    await githubService.loadRepos();
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Repo icon */}
        <Github className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />

        {/* Repo Selector */}
        <Select
          value={githubService.selectedRepo?.id || ''}
          options={repoOptions}
          onChange={handleRepoChange}
          placeholder="选择仓库..."
          loading={githubService.isLoadingRepos}
          disabled={githubService.isLoadingRepos}
          className="min-w-[180px]"
          footerAction={{ label: '+ 添加仓库', onClick: () => setIsManaging(true) }}
        />

        {/* Branch Selector */}
        <Select
          value={githubService.selectedBranch}
          options={branchOptions}
          onChange={handleBranchChange}
          placeholder="选择分支..."
          loading={githubService.isLoadingBranches}
          disabled={!githubService.selectedRepo || githubService.isLoadingBranches}
          className="min-w-[140px]"
        />

        {/* Error Display */}
        {githubService.error && (
          <span className="text-sm text-red-500">{githubService.error}</span>
        )}
      </div>

      {/* Repo Manager Modal */}
      {isManaging && (
        <RepoManager
          onClose={handleManageClose}
          onRepoAdded={handleManageClose}
        />
      )}
    </>
  );
});
