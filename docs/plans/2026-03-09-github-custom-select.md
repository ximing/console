# GitHub Custom Select & Storage Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace native `<select>` elements in GitHub repo/branch selector with a custom themed dropdown component, and persist the selected repo/branch to localStorage for auto-restore on next visit.

**Architecture:** Build a reusable `Select` component in `apps/web/src/components/select.tsx` using Tailwind classes consistent with the project theme. Add `saveSelection()`/`restoreSelection()` methods to `GithubService` using `localStorage`. Update `RepoSelector` to use the new component.

**Tech Stack:** React 19, Tailwind CSS, @rabjs/react (view/useService), localStorage

---

### Task 1: Create custom Select component

**Files:**
- Create: `apps/web/src/components/select.tsx`

**Step 1: Create the component**

```tsx
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export const Select = ({
  value,
  options,
  onChange,
  placeholder = '请选择...',
  disabled = false,
  loading = false,
  className = '',
}: SelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const isDisabled = disabled || loading;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => !isDisabled && setIsOpen((prev) => !prev)}
        disabled={isDisabled}
        className={`
          flex items-center gap-2 px-3 py-2 w-full
          bg-white dark:bg-dark-800
          border border-gray-200 dark:border-dark-700
          rounded-lg text-sm text-left
          transition-colors
          ${isDisabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-gray-50 dark:hover:bg-dark-700 cursor-pointer'
          }
          ${isOpen ? 'ring-2 ring-primary-500' : ''}
        `}
      >
        <span className={`flex-1 truncate ${!selectedOption ? 'text-gray-400 dark:text-gray-500' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {loading ? (
          <Loader2 className="w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400 animate-spin" />
        ) : (
          <ChevronDown
            className={`w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[160px] bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-lg overflow-hidden">
          <div className="max-h-[240px] overflow-y-auto py-1">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">暂无选项</div>
            ) : (
              options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`
                    flex items-center w-full px-3 py-2 text-sm text-left transition-colors
                    ${option.value === value
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-900 dark:text-gray-50'
                    }
                  `}
                >
                  <span className="truncate">{option.label}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
```

**Step 2: Verify the file was created**

```bash
ls apps/web/src/components/select.tsx
```
Expected: file exists

**Step 3: Commit**

```bash
git add apps/web/src/components/select.tsx
git commit -m "feat: add custom Select component with theme support"
```

---

### Task 2: Add localStorage persistence to GithubService

**Files:**
- Modify: `apps/web/src/pages/github/github.service.ts`

**Step 1: Add storage constants and save/restore methods**

Add after the class property declarations (after line `private octokit: Octokit | null = null;`):

```ts
private static STORAGE_REPO_KEY = 'github_selected_repo_id';
private static STORAGE_BRANCH_KEY = 'github_selected_branch';

private saveSelection(): void {
  if (this.selectedRepo) {
    localStorage.setItem(GithubService.STORAGE_REPO_KEY, this.selectedRepo.id);
  }
  if (this.selectedBranch) {
    localStorage.setItem(GithubService.STORAGE_BRANCH_KEY, this.selectedBranch);
  }
}

private clearStoredSelection(): void {
  localStorage.removeItem(GithubService.STORAGE_REPO_KEY);
  localStorage.removeItem(GithubService.STORAGE_BRANCH_KEY);
}
```

**Step 2: Update `loadRepos()` to auto-restore after loading**

Replace the `loadRepos()` method body's `finally` block — after `this.repos = data.repos;`, add auto-restore logic:

```ts
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
      }
    }
  } catch (err) {
    this.error = 'Failed to load repositories';
    console.error('Load repos error:', err);
  } finally {
    this.isLoadingRepos = false;
  }
}
```

**Step 3: Update `selectRepo()` to save selection and restore branch**

Replace the `selectRepo()` method:

```ts
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
```

**Step 4: Update `loadBranches()` to accept a preferred branch**

Replace the `loadBranches()` signature and default branch selection logic:

```ts
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
```

**Step 5: Update `selectBranch()` to save selection**

```ts
async selectBranch(branch: string): Promise<void> {
  this.selectedBranch = branch;
  this.saveSelection();
  await this.loadFileTree();
}
```

**Step 6: Update `clearSelectedRepo()` to clear storage**

Add `this.clearStoredSelection();` at the start of `clearSelectedRepo()`:

```ts
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
```

**Step 7: Commit**

```bash
git add apps/web/src/pages/github/github.service.ts
git commit -m "feat: persist GitHub repo/branch selection to localStorage"
```

---

### Task 3: Update RepoSelector to use custom Select component

**Files:**
- Modify: `apps/web/src/pages/github/components/repo-selector.tsx`

**Step 1: Replace the component**

Replace the entire file content:

```tsx
import { view, useService } from '@rabjs/react';
import { GithubService } from '../github.service';
import { Github } from 'lucide-react';
import { Select } from '../../../components/select';
import type { SelectOption } from '../../../components/select';

export const RepoSelector = view(() => {
  const githubService = useService(GithubService);

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

  return (
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
  );
});
```

**Step 2: Commit**

```bash
git add apps/web/src/pages/github/components/repo-selector.tsx
git commit -m "feat: replace native select with custom Select component in RepoSelector"
```

---

### Task 4: Verify in browser

**Step 1: Start dev server**

```bash
pnpm dev:web
```

**Step 2: Manual checks**

- [ ] Navigate to `/github` — Layout sidebar visible
- [ ] Repo dropdown opens with themed styling (matches dark/light mode)
- [ ] Select a repo — branches load and dropdown shows branches
- [ ] Select a branch — file tree loads
- [ ] Refresh page — repo and branch are auto-restored, file tree loads automatically
- [ ] Toggle dark/light mode — dropdowns match theme
- [ ] Dropdown closes when clicking outside
- [ ] Loading spinner shows while fetching
