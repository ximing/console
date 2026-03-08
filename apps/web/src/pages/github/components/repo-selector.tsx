import { view, useService } from '@rabjs/react';
import { GithubService } from '../github.service';
import { ChevronDown, Loader2, Github } from 'lucide-react';

export const RepoSelector = view(() => {
  const githubService = useService(GithubService);

  const handleRepoChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const repoId = e.target.value;
    if (!repoId) return;

    const repo = githubService.repos.find((r) => r.id === repoId);
    if (repo) {
      await githubService.selectRepo(repo);
    }
  };

  const handleBranchChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const branch = e.target.value;
    if (!branch) return;

    await githubService.selectBranch(branch);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Repo Selector */}
      <div className="relative">
        <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <select
          value={githubService.selectedRepo?.id || ''}
          onChange={handleRepoChange}
          disabled={githubService.isLoadingRepos}
          className="pl-9 pr-8 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-[180px]"
        >
          <option value="">选择仓库...</option>
          {githubService.repos.map((repo) => (
            <option key={repo.id} value={repo.id}>
              {repo.name}
            </option>
          ))}
        </select>
        {githubService.isLoadingRepos && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>

      {/* Branch Selector */}
      <div className="relative">
        <select
          value={githubService.selectedBranch}
          onChange={handleBranchChange}
          disabled={!githubService.selectedRepo || githubService.isLoadingBranches}
          className="pl-3 pr-8 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-[140px]"
        >
          <option value="">选择分支...</option>
          {githubService.branches.map((branch) => (
            <option key={branch.name} value={branch.name}>
              {branch.name}
              {branch.protected ? ' (protected)' : ''}
            </option>
          ))}
        </select>
        {githubService.isLoadingBranches && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>

      {/* Error Display */}
      {githubService.error && (
        <span className="text-sm text-red-500">{githubService.error}</span>
      )}
    </div>
  );
});
