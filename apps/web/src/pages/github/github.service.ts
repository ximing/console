import { Service } from '@rabjs/react';
import { Octokit } from '@octokit/rest';
import { githubApi } from '../../api/github';
import type { GithubRepoDto } from '@x-console/dto';

export interface Branch {
  name: string;
  protected: boolean;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: 'tree' | 'blob';
  sha?: string;
  children?: FileTreeNode[];
}

export interface OpenTab {
  path: string;
  content: string;
  sha?: string;
  isDirty: boolean;
  isNew: boolean;
}

export type PendingChangeType = 'edit' | 'create' | 'delete';

export interface PendingChange {
  type: PendingChangeType;
  content?: string;
  sha?: string;
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
  isLoadingFileTree = false;
  error: string | null = null;

  // File tree and tabs state
  fileTree: FileTreeNode[] = [];
  openTabs: OpenTab[] = [];
  activeTabPath: string | null = null;
  pendingChanges: Map<string, PendingChange> = new Map();

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
    // Load file tree when branch changes
    await this.loadFileTree();
  }

  /**
   * Clear selected repository
   */
  clearSelectedRepo(): void {
    this.selectedRepo = null;
    this.selectedBranch = '';
    this.branches = [];
    this.fileTree = [];
    this.openTabs = [];
    this.activeTabPath = null;
    this.pendingChanges.clear();
    this.octokit = null;
    this.error = null;
  }

  /**
   * Load file tree for selected branch
   */
  async loadFileTree(): Promise<void> {
    if (!this.selectedRepo || !this.octokit || !this.selectedBranch) {
      return;
    }

    this.isLoadingFileTree = true;

    try {
      const [owner, repo] = this.selectedRepo.full_name.split('/');

      const response = await this.octokit.git.getTree({
        owner,
        repo,
        tree_sha: this.selectedBranch,
        recursive: '1',
      });

      // Build tree structure from flat list
      this.fileTree = this.buildFileTree(response.data.tree);
    } catch (err) {
      this.error = 'Failed to load file tree';
      console.error('Load file tree error:', err);
      this.fileTree = [];
    } finally {
      this.isLoadingFileTree = false;
    }
  }

  /**
   * Build file tree from flat GitHub API response
   */
  private buildFileTree(
    items: Array<{ path: string; type: string; sha: string; mode: string }>
  ): FileTreeNode[] {
    const root: FileTreeNode[] = [];

    for (const item of items) {
      const parts = item.path.split('/');
      let current = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        const type = item.type === 'tree' ? 'tree' : 'blob';

        let node = current.find((n) => n.name === part);

        if (!node) {
          node = {
            name: part,
            path: item.path,
            type: isLast ? type : 'tree',
            sha: isLast ? item.sha : undefined,
            children: isLast ? undefined : [],
          };
          current.push(node);
        }

        if (node.children) {
          current = node.children;
        }
      }
    }

    // Sort: directories first, then files, alphabetically
    const sortNodes = (nodes: FileTreeNode[]): void => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'tree' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      nodes.forEach((n) => n.children && sortNodes(n.children));
    };

    sortNodes(root);
    return root;
  }

  /**
   * Open a file in a tab
   */
  async openFile(path: string): Promise<void> {
    // Check if tab already exists
    const existingTab = this.openTabs.find((t) => t.path === path);
    if (existingTab) {
      this.activeTabPath = path;
      return;
    }

    // Check if file is pending creation
    const pendingChange = this.pendingChanges.get(path);
    if (pendingChange && pendingChange.type === 'create') {
      const newTab: OpenTab = {
        path,
        content: pendingChange.content || '',
        isDirty: true,
        isNew: true,
      };
      this.openTabs.push(newTab);
      this.activeTabPath = path;
      return;
    }

    if (!this.selectedRepo || !this.octokit) {
      return;
    }

    try {
      const [owner, repo] = this.selectedRepo.full_name.split('/');
      const [filePath, ...rest] = path.split('/');
      const fileName = rest.length > 0 ? rest.join('/') : filePath;

      const response = await this.octokit.repos.getContent({
        owner,
        repo,
        path: fileName,
        ref: this.selectedBranch,
      });

      const content = response.data as { content?: string; encoding?: string; sha?: string };
      const decodedContent = content.content ? atob(content.content) : '';

      const newTab: OpenTab = {
        path,
        content: decodedContent,
        sha: content.sha,
        isDirty: false,
        isNew: false,
      };

      this.openTabs.push(newTab);
      this.activeTabPath = path;
    } catch (err) {
      this.error = 'Failed to open file';
      console.error('Open file error:', err);
    }
  }

  /**
   * Close a tab
   * Returns false if tab has unsaved changes
   */
  closeTab(path: string): boolean {
    const tabIndex = this.openTabs.findIndex((t) => t.path === path);
    if (tabIndex === -1) {
      return true;
    }

    const tab = this.openTabs[tabIndex];

    // Check for unsaved changes
    if (tab.isDirty) {
      return false;
    }

    // Remove tab
    this.openTabs.splice(tabIndex, 1);

    // Update active tab
    if (this.activeTabPath === path) {
      this.activeTabPath = this.openTabs.length > 0 ? this.openTabs[this.openTabs.length - 1].path : null;
    }

    return true;
  }

  /**
   * Force close a tab (for pending delete)
   */
  forceCloseTab(path: string): void {
    const tabIndex = this.openTabs.findIndex((t) => t.path === path);
    if (tabIndex !== -1) {
      this.openTabs.splice(tabIndex, 1);
      if (this.activeTabPath === path) {
        this.activeTabPath = this.openTabs.length > 0 ? this.openTabs[this.openTabs.length - 1].path : null;
      }
    }
  }

  /**
   * Set active tab
   */
  setActiveTab(path: string): void {
    const tab = this.openTabs.find((t) => t.path === path);
    if (tab) {
      this.activeTabPath = path;
    }
  }

  /**
   * Update file content
   */
  updateFile(path: string, content: string): void {
    const tab = this.openTabs.find((t) => t.path === path);
    if (tab) {
      tab.content = content;
      tab.isDirty = true;

      // Update pending changes
      this.pendingChanges.set(path, {
        type: 'edit',
        content,
        sha: tab.sha,
      });
    }
  }
}

// Export singleton instance
export const githubService = new GithubService();
