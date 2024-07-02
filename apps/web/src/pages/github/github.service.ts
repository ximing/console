import { Service } from '@rabjs/react';
import { Octokit } from '@octokit/rest';
import { githubApi } from '../../api/github';
import type { GithubRepoDto } from '@x-console/dto';

export interface Branch {
  name: string;
  protected: boolean;
}

/**
 * GithubService
 * Manages GitHub repository state and operations
 */
export class GithubService extends Service {
  // Observable state
  repos: GithubRepoDto[] = [];
  selectedRepo: GithubRepoDto | null = null;
  selectedBranch: string = '';
  branches: Branch[] = [];
  isLoadingRepos = false;
  isLoadingBranches = false;
  error: string | null = null;

  // Octokit instance (initialized when repo is selected)
  private octokit: Octokit | null = null;

  /**
   * Load all repositories for current user
   */
  async loadRepos(): Promise<void> {
    this.isLoadingRepos = true;
    this.error = null;

    try {
      const data = await githubApi.getRepos();
      this.repos = data.repos;
    } catch (err) {
      this.error = 'Failed to load repositories';
      console.error('Load repos error:', err);
    } finally {
      this.isLoadingRepos = false;
    }
  }

  /**
   * Select a repository and initialize Octokit
   */
  async selectRepo(repo: GithubRepoDto): Promise<void> {
    this.selectedRepo = repo;
    this.error = null;

    try {
      // Get the decrypted PAT
      const tokenData = await githubApi.getToken(repo.id);

      // Initialize Octokit with the token
      this.octokit = new Octokit({
        auth: tokenData.pat,
      });

      // Load branches
      await this.loadBranches();
    } catch (err) {
      this.error = 'Failed to initialize repository';
      console.error('Select repo error:', err);
      this.octokit = null;
    }
  }

  /**
   * Load branches for selected repository
   */
  async loadBranches(): Promise<void> {
    if (!this.selectedRepo || !this.octokit) {
      return;
    }

    this.isLoadingBranches = true;

    try {
      // Parse owner and repo from full_name
      const [owner, repo] = this.selectedRepo.full_name.split('/');

      const response = await this.octokit.repos.listBranches({
        owner,
        repo,
        per_page: 100,
      });

      this.branches = response.data.map((branch) => ({
        name: branch.name,
        protected: branch.protected || false,
      }));

      // Select default branch if none selected
      if (!this.selectedBranch && this.branches.length > 0) {
        // Try to find the default branch
        const defaultBranch = this.branches.find((b) => b.name === 'main' || b.name === 'master');
        this.selectedBranch = defaultBranch?.name || this.branches[0].name;
      }
    } catch (err) {
      this.error = 'Failed to load branches';
      console.error('Load branches error:', err);
      this.branches = [];
    } finally {
      this.isLoadingBranches = false;
    }
  }

  /**
   * Select a branch
   */
  async selectBranch(branch: string): Promise<void> {
    this.selectedBranch = branch;
    // In the future, this will trigger file tree reload
  }

  /**
   * Clear selected repository
   */
  clearSelectedRepo(): void {
    this.selectedRepo = null;
    this.selectedBranch = '';
    this.branches = [];
    this.octokit = null;
    this.error = null;
  }
}

// Export singleton instance
export const githubService = new GithubService();
