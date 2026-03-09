import { Service, resolve } from '@rabjs/react';
import { Octokit } from '@octokit/rest';
import { githubApi } from '../../api/github';
import { ToastService } from '../../services/toast.service';
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
  private static STORAGE_REPO_KEY = 'github_selected_repo_id';
  private static STORAGE_BRANCH_KEY = 'github_selected_branch';

  private saveSelection(): void {
    if (this.selectedRepo && this.selectedBranch) {
      localStorage.setItem(GithubService.STORAGE_REPO_KEY, this.selectedRepo.id);
      localStorage.setItem(GithubService.STORAGE_BRANCH_KEY, this.selectedBranch);
    }
  }

  private clearStoredSelection(): void {
    localStorage.removeItem(GithubService.STORAGE_REPO_KEY);
    localStorage.removeItem(GithubService.STORAGE_BRANCH_KEY);
  }

  // Toast service for error notifications
  private get toast(): ToastService {
    return resolve(ToastService);
  }

  /**
   * Handle GitHub API errors and show toast notifications
   */
  private handleError(error: unknown, defaultMessage: string): string {
    const err = error as { status?: number; message?: string };
    const status = err.status;

    if (status === 403 && err.message?.includes('rate limit')) {
      const message = '请求过于频繁，请稍后重试';
      this.toast.error(message);
      return message;
    }

    if (status === 401 || status === 403) {
      const message = 'Token 无效，请重新配置';
      this.toast.error(message);
      return message;
    }

    if (status === 422) {
      const message = '文件已被远程修改，请重新加载';
      this.toast.error(message);
      return message;
    }

    const message = err.message || defaultMessage;
    this.error = message;
    this.toast.error(message);
    console.error(defaultMessage, error);
    return message;
  }

  /**
   * Load all repositories for current user
   */
  async loadRepos(): Promise<void> {
    this.isLoadingRepos = true;
    this.error = null;

    try {
      const data = await githubApi.getRepos();
      this.repos = data.repos;

      // Auto-restore previously selected repo
      const savedRepoId = localStorage.getItem(GithubService.STORAGE_REPO_KEY);
      if (savedRepoId) {
        const savedRepo = this.repos.find((r) => r.id === savedRepoId);
        if (savedRepo) {
          await this.selectRepo(savedRepo);
        } else {
          this.clearStoredSelection();
        }
      }
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
    this.selectedBranch = '';
    this.error = null;

    try {
      const tokenData = await githubApi.getToken(repo.id);
      this.octokit = new Octokit({ auth: tokenData.pat });

      // Restore saved branch before loading branches
      const savedBranch = localStorage.getItem(GithubService.STORAGE_BRANCH_KEY);

      await this.loadBranches(savedBranch ?? undefined);

      // Save repo selection after successful init
      this.saveSelection();
    } catch (err) {
      this.error = 'Failed to initialize repository';
      console.error('Select repo error:', err);
      this.octokit = null;
    }
  }

  /**
   * Load branches for selected repository
   */
  async loadBranches(preferredBranch?: string): Promise<void> {
    if (!this.selectedRepo || !this.octokit) return;

    this.isLoadingBranches = true;

    try {
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

      if (!this.selectedBranch && this.branches.length > 0) {
        // Try preferred (saved) branch first, then main/master, then first
        const preferred = preferredBranch
          ? this.branches.find((b) => b.name === preferredBranch)
          : undefined;
        const defaultBranch = this.branches.find((b) => b.name === 'main' || b.name === 'master');
        this.selectedBranch = preferred?.name ?? defaultBranch?.name ?? this.branches[0].name;

        // Load file tree for the restored/default branch
        await this.loadFileTree();
      }
    } catch (err) {
      this.handleError(err, 'Failed to load branches');
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
    await this.loadFileTree();
    this.saveSelection();
  }

  /**
   * Clear selected repository
   */
  clearSelectedRepo(): void {
    this.clearStoredSelection();
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
      this.handleError(err, 'Failed to load file tree');
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
      this.handleError(err, 'Failed to open file');
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

  /**
   * Create a new file (local only, pending commit)
   */
  createFile(path: string): void {
    // Add to pending changes
    this.pendingChanges.set(path, {
      type: 'create',
      content: '',
    });

    // Add to file tree
    this.addNodeToTree(this.fileTree, path, 'blob');

    // Open empty tab
    const newTab: OpenTab = {
      path,
      content: '',
      isDirty: true,
      isNew: true,
    };
    this.openTabs.push(newTab);
    this.activeTabPath = path;
  }

  /**
   * Create a new directory (local only)
   */
  createDirectory(path: string): void {
    // Add to file tree only (Git doesn't support empty directories)
    this.addNodeToTree(this.fileTree, path, 'tree');
  }

  /**
   * Add a node to the file tree
   */
  private addNodeToTree(tree: FileTreeNode[], path: string, type: 'tree' | 'blob'): void {
    const parts = path.split('/');
    let current = tree;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      let node = current.find((n) => n.name === part);

      if (!node) {
        node = {
          name: part,
          path: isLast ? path : parts.slice(0, i + 1).join('/'),
          type: isLast ? type : 'tree',
          children: isLast ? undefined : [],
        };
        current.push(node);
      }

      if (node.children) {
        current = node.children;
      }
    }

    // Sort after adding
    current.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'tree' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Delete a file (local only, pending commit)
   */
  deleteFile(path: string): void {
    // Find the file to get its sha
    const tab = this.openTabs.find((t) => t.path === path);

    // Add to pending changes
    this.pendingChanges.set(path, {
      type: 'delete',
      sha: tab?.sha,
    });

    // Remove from file tree
    this.removeNodeFromTree(this.fileTree, path);

    // Force close tab if open
    this.forceCloseTab(path);
  }

  /**
   * Remove a node from the file tree
   */
  private removeNodeFromTree(tree: FileTreeNode[], path: string): void {
    const parts = path.split('/');
    const fileName = parts.pop();
    let current = tree;

    // Navigate to parent directory
    for (const part of parts) {
      const node = current.find((n) => n.name === part && n.type === 'tree');
      if (node?.children) {
        current = node.children;
      } else {
        return;
      }
    }

    // Remove the file
    const index = current.findIndex((n) => n.name === fileName);
    if (index !== -1) {
      current.splice(index, 1);
    }
  }

  /**
   * Commit changes to GitHub
   * @param message - Commit message
   * @param selectedPaths - Array of file paths to commit (if empty, commits all pending changes)
   */
  async commitChanges(message: string, selectedPaths: string[] = []): Promise<boolean> {
    if (!this.selectedRepo || !this.octokit || !this.selectedBranch) {
      this.error = 'No repository selected';
      return false;
    }

    if (!message.trim()) {
      this.error = 'Commit message is required';
      return false;
    }

    const [owner, repo] = this.selectedRepo.full_name.split('/');

    // Determine which files to commit
    const pathsToCommit = selectedPaths.length > 0
      ? selectedPaths.filter((p) => this.pendingChanges.has(p))
      : Array.from(this.pendingChanges.keys());

    if (pathsToCommit.length === 0) {
      this.error = 'No changes to commit';
      return false;
    }

    try {
      // Step 1: Get current branch HEAD sha
      const refResponse = await this.octokit.git.getRef({
        owner,
        repo,
        ref: `heads/${this.selectedBranch}`,
      });
      const headSha = refResponse.data.object.sha;

      // Step 2: Get the current commit to get its tree sha
      const currentCommitResponse = await this.octokit.git.getCommit({
        owner,
        repo,
        commit_sha: headSha,
      });
      const baseTreeSha = currentCommitResponse.data.tree.sha;

      // Step 3: Build tree entries from pending changes
      const treeEntries: {
        path: string;
        mode: '100644';
        type: 'blob';
        sha: string | null;
      }[] = [];

      for (const filePath of pathsToCommit) {
        const change = this.pendingChanges.get(filePath);
        if (!change) continue;

        if (change.type === 'delete') {
          // Deletion: sha: null removes the file
          treeEntries.push({
            path: filePath,
            mode: '100644',
            type: 'blob',
            sha: null as unknown as string, // null removes the file
          });
        } else {
          // Edit or create: need to create blob first
          const content = change.content || '';
          const blobResponse = await this.octokit.git.createBlob({
            owner,
            repo,
            content: btoa(content),
            encoding: 'base64',
          });

          treeEntries.push({
            path: filePath,
            mode: '100644',
            type: 'blob',
            sha: blobResponse.data.sha,
          });
        }
      }

      // Step 4: Create new tree
      const treeResponse = await this.octokit.git.createTree({
        owner,
        repo,
        base_tree: baseTreeSha,
        tree: treeEntries,
      });

      // Step 5: Create commit
      const newCommitResponse = await this.octokit.git.createCommit({
        owner,
        repo,
        message,
        tree: treeResponse.data.sha,
        parents: [headSha],
      });

      // Step 6: Update reference
      await this.octokit.git.updateRef({
        owner,
        repo,
        ref: `heads/${this.selectedBranch}`,
        sha: newCommitResponse.data.sha,
      });

      // Success: clear pending changes and update tabs
      for (const filePath of pathsToCommit) {
        this.pendingChanges.delete(filePath);

        // Update tab dirty state
        const tab = this.openTabs.find((t) => t.path === filePath);
        if (tab) {
          tab.isDirty = false;
        }
      }

      return true;
    } catch (err) {
      this.handleError(err, 'Failed to commit changes');
      return false;
    }
  }
}

// Export singleton instance
export const githubService = new GithubService();
