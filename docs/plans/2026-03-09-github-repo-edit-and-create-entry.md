# GitHub Repo Edit & Create Entry Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Add edit (name + PAT with masked placeholder) support to existing repos in RepoManager, and add a「+ 添加仓库」footer entry in the repo Select dropdown that opens RepoManager as a modal.

**Architecture:** Three coordinated changes — (1) `Select` component gains an optional `footerAction` prop rendered below the options list; (2) `RepoManager` gains an optional `onClose` prop that turns it into a modal; (3) `RepoSelector` wires the two together with local `isManaging` state and refreshes `GithubService.repos` after the modal closes. Edit flow lives entirely inside `RepoManager` using inline expand-on-click form per row.

**Tech Stack:** React 19, Tailwind CSS, @rabjs/react (`view`/`useService`), `githubApi.updateRepo()` (already exists), `githubApi.getToken()` (already exists, used to pre-fill masked PAT)

---

### Task 1: Add `footerAction` prop to Select component

**Files:**
- Modify: `apps/web/src/components/select.tsx`

**Context:**
The `Select` component renders a `[role="listbox"]` dropdown. We need to add an optional `footerAction` prop: `{ label: string; onClick: () => void }`. When provided, render a sticky button at the bottom of the dropdown (outside the scrollable options div, so it's always visible). Clicking it calls `onClick` and closes the dropdown.

**Step 1: Add `footerAction` to the interface**

In `SelectProps` interface, add after `'aria-label'?: string;`:

```tsx
footerAction?: { label: string; onClick: () => void };
```

**Step 2: Destructure the new prop**

In the component function signature, add `footerAction` to the destructured props.

**Step 3: Render the footer button**

Replace the dropdown JSX (the `{isOpen && (...)}` block). The new structure wraps options in a scrollable div and adds a footer button below it:

```tsx
{isOpen && (
  <div
    id={listboxId}
    role="listbox"
    className="absolute z-50 mt-1 w-full min-w-[160px] bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-lg overflow-hidden"
  >
    <div className="max-h-[240px] overflow-y-auto py-1">
      {options.length === 0 ? (
        <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">暂无选项</div>
      ) : (
        options.map((option, index) => (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={option.value === value}
            onClick={() => handleSelect(option.value)}
            onKeyDown={(e) => handleOptionKeyDown(e, index)}
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
    {footerAction && (
      <div className="border-t border-gray-200 dark:border-dark-700">
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            footerAction.onClick();
          }}
          className="flex items-center w-full px-3 py-2 text-sm text-left text-primary-600 dark:text-primary-400 hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
        >
          {footerAction.label}
        </button>
      </div>
    )}
  </div>
)}
```

**Step 4: Verify build**

```bash
pnpm --filter @x-console/web tsc --noEmit 2>&1 | head -20
```
Expected: no errors related to `select.tsx`

**Step 5: Commit**

```bash
git add apps/web/src/components/select.tsx
git commit -m "feat: add footerAction prop to Select component"
```

---

### Task 2: Add edit functionality to RepoManager

**Files:**
- Modify: `apps/web/src/pages/github/components/repo-manager.tsx`

**Context:**
`RepoManager` currently shows a list of repos with a delete button per row. We need to:
1. Add an edit (pencil) button per row
2. Clicking edit expands that row into an inline edit form with: name (pre-filled), full_name (pre-filled), PAT (shows `••••••••` placeholder — user must clear to enter new token)
3. Submit calls `githubApi.updateRepo(id, { name, full_name, pat? })` — only include `pat` in payload if user actually typed something
4. Cancel restores the row to read mode

**Step 1: Add edit state**

After the existing `useState` declarations, add:

```tsx
const [editingId, setEditingId] = useState<string | null>(null);
const [editName, setEditName] = useState('');
const [editFullName, setEditFullName] = useState('');
const [editPat, setEditPat] = useState('');
const [editPatTouched, setEditPatTouched] = useState(false);
const [isEditSubmitting, setIsEditSubmitting] = useState(false);
const [editErrors, setEditErrors] = useState<Record<string, string>>({});
```

**Step 2: Add `startEdit` helper**

After `handleCancel`, add:

```tsx
const startEdit = (repo: GithubRepoDto) => {
  setEditingId(repo.id);
  setEditName(repo.name);
  setEditFullName(repo.full_name);
  setEditPat('');
  setEditPatTouched(false);
  setEditErrors({});
};

const cancelEdit = () => {
  setEditingId(null);
  setEditErrors({});
};

const validateEdit = (): boolean => {
  const newErrors: Record<string, string> = {};
  if (!editName.trim()) newErrors.editName = '请输入显示名称';
  if (!editFullName.trim()) {
    newErrors.editFullName = '请输入仓库路径';
  } else if (!/^[^/]+\/[^/]+$/.test(editFullName.trim())) {
    newErrors.editFullName = '仓库路径格式应为 owner/repo';
  }
  setEditErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

const handleEditSubmit = async (e: React.FormEvent, repoId: string) => {
  e.preventDefault();
  if (!validateEdit()) return;

  setIsEditSubmitting(true);
  try {
    const updateData: { name: string; full_name: string; pat?: string } = {
      name: editName.trim(),
      full_name: editFullName.trim(),
    };
    // Only send PAT if user actually typed something
    if (editPatTouched && editPat.trim()) {
      updateData.pat = editPat.trim();
    }

    await githubApi.updateRepo(repoId, updateData);
    toastService.success('仓库更新成功');
    setEditingId(null);
    await loadRepos();
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : '更新仓库失败';
    toastService.error(errorMessage);
  } finally {
    setIsEditSubmitting(false);
  }
};
```

**Step 3: Add `Pencil` to lucide imports**

Change the import line from:
```tsx
import { Trash2, Plus, Github, Loader2 } from 'lucide-react';
```
to:
```tsx
import { Trash2, Plus, Github, Loader2, Pencil } from 'lucide-react';
```

**Step 4: Replace the repo list rendering**

Replace the `repos.map(...)` block inside the `<div className="space-y-2">` with this:

```tsx
{repos.map((repo) =>
  editingId === repo.id ? (
    // Edit form row
    <div
      key={repo.id}
      className="p-4 bg-white dark:bg-dark-800 border border-primary-300 dark:border-primary-700 rounded-lg"
    >
      <form onSubmit={(e) => handleEditSubmit(e, repo.id)} className="space-y-3">
        <div>
          <label className="block text-sm font-medium mb-1">显示名称</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 dark:border-dark-700 rounded-lg bg-gray-50 dark:bg-dark-900 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            disabled={isEditSubmitting}
          />
          {editErrors.editName && <p className="text-xs text-red-500 mt-1">{editErrors.editName}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">仓库路径</label>
          <input
            type="text"
            value={editFullName}
            onChange={(e) => setEditFullName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 dark:border-dark-700 rounded-lg bg-gray-50 dark:bg-dark-900 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            disabled={isEditSubmitting}
          />
          {editErrors.editFullName && <p className="text-xs text-red-500 mt-1">{editErrors.editFullName}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Personal Access Token</label>
          <input
            type="password"
            value={editPat}
            placeholder={editPatTouched ? '' : '••••••••'}
            onChange={(e) => {
              setEditPat(e.target.value);
              setEditPatTouched(true);
            }}
            className="w-full px-3 py-2 border border-gray-200 dark:border-dark-700 rounded-lg bg-gray-50 dark:bg-dark-900 text-gray-900 dark:text-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            disabled={isEditSubmitting}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">留空则不修改 Token</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={cancelEdit}
            disabled={isEditSubmitting}
            className="px-3 py-1.5 text-sm border border-gray-200 dark:border-dark-700 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-800 transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isEditSubmitting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {isEditSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            保存
          </button>
        </div>
      </form>
    </div>
  ) : (
    // Normal read row
    <div
      key={repo.id}
      className="flex items-center justify-between p-4 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg hover:bg-gray-100/50 dark:hover:bg-dark-800/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Github className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        <div>
          <p className="font-medium">{repo.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{repo.full_name}</p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => startEdit(repo)}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
          title="编辑仓库"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleDelete(repo.id, repo.name)}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title="删除仓库"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
)}
```

**Step 5: Verify build**

```bash
pnpm --filter @x-console/web tsc --noEmit 2>&1 | head -20
```
Expected: no errors

**Step 6: Commit**

```bash
git add apps/web/src/pages/github/components/repo-manager.tsx
git commit -m "feat: add inline edit form to RepoManager"
```

---

### Task 3: Make RepoManager work as a modal and wire up RepoSelector

**Files:**
- Modify: `apps/web/src/pages/github/components/repo-manager.tsx`
- Modify: `apps/web/src/pages/github/components/repo-selector.tsx`

**Context:**
`RepoManager` needs an optional `onClose?: () => void` prop. When provided, render it as a fixed modal overlay with a close button in the header. `RepoSelector` adds `footerAction` to the repo Select and manages `isManaging` state; when the modal closes, it calls `githubService.loadRepos()` to refresh the list.

**Step 1: Add `onClose` prop to RepoManager**

At the top of `repo-manager.tsx`, change the interface:

```tsx
interface RepoManagerProps {
  onClose?: () => void;
  onRepoAdded?: () => void;
}
```

**Step 2: Render modal wrapper when `onClose` is provided**

Replace the outermost `return (` JSX. The component should conditionally wrap its content:

```tsx
const content = (
  <div className={onClose ? 'p-4 max-w-2xl w-full' : 'p-4 max-w-2xl mx-auto'}>
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-semibold">GitHub 仓库管理</h2>
      <div className="flex items-center gap-2">
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加仓库
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            title="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
    {/* ... rest of the existing content (add form + repo list) unchanged ... */}
  </div>
);

if (onClose) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-xl max-h-[80vh] overflow-y-auto">
        {content}
      </div>
    </div>
  );
}

return content;
```

**Step 3: Add `X` to lucide imports in repo-manager.tsx**

```tsx
import { Trash2, Plus, Github, Loader2, Pencil, X } from 'lucide-react';
```

**Step 4: Update RepoSelector to add footerAction and modal**

Replace the entire content of `apps/web/src/pages/github/components/repo-selector.tsx`:

```tsx
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
```

**Step 5: Verify build**

```bash
pnpm --filter @x-console/web tsc --noEmit 2>&1 | head -20
```
Expected: no errors

**Step 6: Commit**

```bash
git add apps/web/src/pages/github/components/repo-manager.tsx apps/web/src/pages/github/components/repo-selector.tsx
git commit -m "feat: add modal mode to RepoManager and wire create entry in RepoSelector"
```

---

### Task 4: Verify in browser

**Step 1: Start dev server**

```bash
pnpm dev:web
```

**Step 2: Manual checks**

- [ ] Navigate to `/github` — repo selector visible in header
- [ ] Open repo dropdown — `+ 添加仓库` appears at the bottom of the list
- [ ] Click `+ 添加仓库` — RepoManager modal opens, backdrop visible
- [ ] Click backdrop — modal closes
- [ ] Add a new repo in modal — success toast, list refreshes, modal closes, new repo appears in dropdown
- [ ] Click pencil icon on a repo — inline edit form expands in that row
- [ ] Edit form shows name and full_name pre-filled, PAT shows `••••••••` placeholder
- [ ] Click PAT field — placeholder clears, can type new token
- [ ] Submit edit without changing PAT — saves successfully (no PAT sent)
- [ ] Submit edit with new PAT — saves successfully
- [ ] Cancel edit — row returns to read mode
- [ ] Delete a repo — confirm dialog, repo removed from list
