# GitHub Actions Dashboard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a GitHub Actions monitoring dashboard that displays workflow runs across all configured GitHub repos, with dashboard stats, list/timeline views, polling, and failure notifications.

**Architecture:**
- **Server**: New controller endpoint `/api/v1/github/actions/runs` that fetches workflow runs from all user repos using Octokit (reuses existing encrypted PAT pattern from github-repo.service)
- **Client**: New `ActionsService` (rabjs/react Service) manages state; components follow existing page structure under `pages/github/actions/`
- **Routing**: Nested route `/github/actions` with tab UI switching between Code/Actions within the GitHub layout

**Tech Stack:** React 19, @rabjs/react, Octokit, Tailwind CSS, existing GitHub integration pattern

---

## Chunk 1: Server API - Workflow Runs Endpoint

### Overview
Add server endpoint to fetch GitHub Actions workflow runs for all configured repos.

### Files
- Create: `apps/server/src/controllers/v1/github-actions.controller.ts`
- Modify: `apps/server/src/controllers/v1/index.ts` (register controller)
- Create: `apps/server/src/services/github-actions.service.ts`
- Create: `packages/dto/src/github.ts` (DTO types for workflow runs)

### Steps

- [ ] **Step 1: Add WorkflowRun DTO types to @x-console/dto**

Create `packages/dto/src/github.ts` with:
```typescript
export interface WorkflowRunDto {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  workflow_name: string;
  repository: string;
  repository_full_name: string;
  head_branch: string;
  event: string;
  actor: string;
  created_at: string;
  updated_at: string;
  run_number: number;
  run_attempt: number;
  html_url: string;
}

export interface WorkflowRunsResponseDto {
  runs: WorkflowRunDto[];
  total_count: number;
}
```

- [ ] **Step 2: Create GithubActionsService**

Create `apps/server/src/services/github-actions.service.ts`:
```typescript
@Service()
export class GithubActionsService {
  async getWorkflowRuns(userId: string, params?: { status?: string; per_page?: number }): Promise<WorkflowRunDto[]> {
    // 1. Get all repos for user (reuse GithubRepoService)
    // 2. For each repo, decrypt PAT and use Octokit to fetch workflow runs
    // 3. Merge and sort by updated_at descending
    // 4. Return flat list of WorkflowRunDto
  }
}
```

- [ ] **Step 3: Create GithubActionsController**

Create `apps/server/src/controllers/v1/github-actions.controller.ts`:
```typescript
@Service()
@JsonController('/api/v1/github/actions')
export class GithubActionsController {
  constructor(private githubActionsService: GithubActionsService) {}

  @Get('/runs')
  async getRuns(@CurrentUser() userDto: UserInfoDto, @QueryParams() query: { status?: string }) {
    // Call service, return ResponseUtil.success({ runs, total_count })
  }
}
```

- [ ] **Step 4: Register controller in index.ts**

Modify `apps/server/src/controllers/v1/index.ts` to import and register the new controller.

- [ ] **Step 5: Build and verify server compiles**

Run: `pnpm --filter @x-console/server build`
Expected: Success with no errors

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/controllers/v1/github-actions.controller.ts apps/server/src/services/github-actions.service.ts packages/dto/src/github.ts
git commit -m "feat(server): add GitHub Actions workflow runs endpoint"
```

---

## Chunk 2: Client API & Service Layer

### Overview
Add client-side API call and ActionsService for state management.

### Files
- Modify: `apps/web/src/api/github.ts` (add actionsApi)
- Create: `apps/web/src/pages/github/actions/actions.service.ts`
- Create: `apps/web/src/pages/github/actions/index.tsx`
- Create: `apps/web/src/pages/github/actions/actions.tsx`

### Steps

- [ ] **Step 1: Add actionsApi to github.ts**

Modify `apps/web/src/api/github.ts`:
```typescript
export const githubApi = {
  // ... existing methods ...

  /**
   * Get workflow runs for all repos
   */
  getWorkflowRuns: async (params?: { status?: string }): Promise<WorkflowRunsResponseDto> => {
    const response = await request.get<unknown, ApiResponse<WorkflowRunsResponseDto>>(
      '/api/v1/github/actions/runs',
      { params }
    );
    return response.data;
  },
};
```

- [ ] **Step 2: Create ActionsService**

Create `apps/web/src/pages/github/actions/actions.service.ts`:
```typescript
export type ViewMode = 'list' | 'timeline';
export type StatusFilter = 'all' | 'success' | 'failure' | 'running';

export interface WorkflowRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null;
  workflow_name: string;
  repository: string;
  repository_full_name: string;
  head_branch: string;
  event: string;
  actor: string;
  created_at: string;
  updated_at: string;
  run_number: number;
  run_attempt: number;
  html_url: string;
}

export class ActionsService extends Service {
  runs: WorkflowRun[] = [];
  isLoading = false;
  error: string | null = null;
  viewMode: ViewMode = 'list';
  filter: StatusFilter = 'all';
  pollInterval: number = 0; // 0 = off, otherwise milliseconds
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private previousFailedIds: Set<number> = new Set();

  get stats() { /* compute total/success/failure/running */ }
  get filteredRuns() { /* apply filter to runs */ }
  get groupedByRepo() { /* group runs by repository_full_name for list view */ }

  async loadRuns(): Promise<void> { /* call actionsApi.getWorkflowRuns */ }
  startPolling(intervalMs: number): void { /* set interval, store timer */ }
  stopPolling(): void { /* clear interval */ }
  setViewMode(mode: ViewMode): void { this.viewMode = mode; }
  setFilter(filter: StatusFilter): void { this.filter = filter; }
}
```

- [ ] **Step 3: Create actions page entry**

Create `apps/web/src/pages/github/actions/index.tsx`:
```typescript
import { bindServices } from '@rabjs/react';
import { ActionsPage } from './actions';
const ActionsPageWithServices = bindServices(ActionsPage, []);
export default ActionsPageWithServices;
```

- [ ] **Step 4: Create actions page component**

Create `apps/web/src/pages/github/actions/actions.tsx` - skeleton with Layout, no content yet:
```typescript
import { view, useService } from '@rabjs/react';
import { ActionsService } from './actions.service';
import { Layout } from '../../../components/layout';

export const ActionsPage = view(() => {
  const actionsService = useService(ActionsService);

  return (
    <Layout>
      <div className="flex flex-col h-full">
        <div className="px-4 py-2">Actions Dashboard (coming soon)</div>
      </div>
    </Layout>
  );
});
```

- [ ] **Step 5: Add route to App.tsx**

Modify `apps/web/src/App.tsx`:
```typescript
// Add import
import ActionsPage from './pages/github/actions';

// Add route inside Routes (after github route):
<Route
  path="/github/actions/*"
  element={
    <ProtectedRoute>
      <ActionsPage />
    </ProtectedRoute>
  }
/>
```

- [ ] **Step 6: Verify page loads without errors**

Run: `pnpm dev:web`
Navigate to: `http://localhost:5173/github/actions`
Expected: Page renders with "Actions Dashboard (coming soon)"

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/api/github.ts apps/web/src/pages/github/actions/
git commit -m "feat(web): add GitHub Actions page skeleton and service"
```

---

## Chunk 3: GitHub Tab Navigation (Code | Actions)

### Overview
Modify existing GitHub page to add tab navigation between Code and Actions views.

### Files
- Modify: `apps/web/src/pages/github/github.tsx`
- Create: `apps/web/src/pages/github/components/github-tabs.tsx`

### Steps

- [ ] **Step 1: Create GithubTabs component**

Create `apps/web/src/pages/github/components/github-tabs.tsx`:
```typescript
import { view, useService } from '@rabjs/react';
import { useNavigate, useLocation } from 'react-router';
import { GithubService } from '../github.service';
import { ActionsService } from '../../actions/actions.service';

export const GithubTabs = view(() => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActions = location.pathname.includes('/actions');

  return (
    <div className="flex items-center border-b border-gray-200 dark:border-zinc-700">
      <button
        onClick={() => navigate('/github')}
        className={`px-4 py-2 text-sm font-medium transition-colors ${
          !isActions
            ? 'text-green-600 border-b-2 border-green-500'
            : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'
        }`}
      >
        Code
      </button>
      <button
        onClick={() => navigate('/github/actions')}
        className={`px-4 py-2 text-sm font-medium transition-colors ${
          isActions
            ? 'text-green-600 border-b-2 border-green-500'
            : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'
        }`}
      >
        Actions
      </button>
    </div>
  );
});
```

- [ ] **Step 2: Modify github.tsx to use tabs**

Modify `apps/web/src/pages/github/github.tsx`:
- Add `<GithubTabs />` above the header content area
- Replace the header div content with a simpler one (tabs handle the routing context)

- [ ] **Step 3: Register ActionsService in GithubPage**

Modify `apps/web/src/pages/github/github.tsx` to register ActionsService alongside GithubService:
```typescript
const GithubPageWithServices = bindServices(GithubPage, [ActionsService]);
```

- [ ] **Step 4: Test tab switching**

Run dev server, navigate to `/github`, click Actions tab, verify URL changes to `/github/actions`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/github/github.tsx apps/web/src/pages/github/components/github-tabs.tsx
git commit -m "feat(web): add Code/Actions tab navigation to GitHub page"
```

---

## Chunk 4: Dashboard - Stats Cards and Repo Status Grid

### Overview
Build the top dashboard section with 4 stat cards and repo status overview.

### Files
- Create: `apps/web/src/pages/github/actions/components/actions-dashboard/index.tsx`
- Create: `apps/web/src/pages/github/actions/components/actions-dashboard/stats-card.tsx`
- Create: `apps/web/src/pages/github/actions/components/actions-dashboard/repo-status-grid.tsx`
- Create: `apps/web/src/pages/github/actions/components/actions-dashboard/actions-dashboard.tsx`

### Steps

- [ ] **Step 1: Create StatsCard component**

Create `apps/web/src/pages/github/actions/components/actions-dashboard/stats-card.tsx`:
```typescript
import { view } from '@rabjs/react';

interface StatsCardProps {
  label: string;
  value: number;
  color: 'green' | 'red' | 'blue' | 'gray';
}

export const StatsCard = view(({ label, value, color }: StatsCardProps) => {
  const colorClasses = {
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
    blue: 'text-blue-600 dark:text-blue-400',
    gray: 'text-gray-600 dark:text-zinc-400',
  };

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm hover:-translate-y-0.5 transition-transform">
      <p className="text-sm text-gray-500 dark:text-zinc-400">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${colorClasses[color]}`}>{value}</p>
    </div>
  );
});
```

- [ ] **Step 2: Create RepoStatusGrid component**

Create `apps/web/src/pages/github/actions/components/actions-dashboard/repo-status-grid.tsx`:
```typescript
import { view, useService } from '@rabjs/react';
import { ActionsService } from '../../actions.service';

export const RepoStatusGrid = view(() => {
  const actionsService = useService(ActionsService);
  const repos = actionsService.groupedByRepo;

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">仓库状态</h3>
      <div className="flex flex-wrap gap-2">
        {Object.entries(repos).map(([repoFullName, runs]) => {
          const latestRun = runs[0];
          const statusDot = getStatusDot(latestRun.status, latestRun.conclusion);
          return (
            <div key={repoFullName} className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-50 dark:bg-zinc-700">
              {statusDot}
              <span className="text-xs text-gray-700 dark:text-zinc-300">{repoFullName}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

function getStatusDot(status: string, conclusion: string | null) {
  // Return colored span based on status/conclusion
}
```

- [ ] **Step 3: Create ActionsDashboard component**

Create `apps/web/src/pages/github/actions/components/actions-dashboard/actions-dashboard.tsx`:
```typescript
import { view, useService } from '@rabjs/react';
import { ActionsService } from '../../actions.service';
import { StatsCard } from './stats-card';
import { RepoStatusGrid } from './repo-status-grid';

export const ActionsDashboard = view(() => {
  const actionsService = useService(ActionsService);
  const { total, success, failure, running } = actionsService.stats;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <StatsCard label="总运行数" value={total} color="gray" />
        <StatsCard label="成功" value={success} color="green" />
        <StatsCard label="失败" value={failure} color="red" />
        <StatsCard label="运行中" value={running} color="blue" />
      </div>
      <RepoStatusGrid />
    </div>
  );
});
```

- [ ] **Step 4: Create barrel export**

Create `apps/web/src/pages/github/actions/components/actions-dashboard/index.tsx`:
```typescript
export { ActionsDashboard } from './actions-dashboard';
export { StatsCard } from './stats-card';
export { RepoStatusGrid } from './repo-status-grid';
```

- [ ] **Step 5: Wire into actions.tsx**

Modify `apps/web/src/pages/github/actions/actions.tsx` to load runs and render dashboard.

- [ ] **Step 6: Test dashboard renders**

Run dev, verify 4 stat cards show with correct values.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/pages/github/actions/components/actions-dashboard/
git commit -m "feat(web): add Actions dashboard with stats cards and repo grid"
```

---

## Chunk 5: List View - Repo Grouped Runs

### Overview
Build list view showing runs grouped by repository.

### Files
- Create: `apps/web/src/pages/github/actions/components/actions-list-view/index.tsx`
- Create: `apps/web/src/pages/github/actions/components/actions-list-view/actions-list-view.tsx`
- Create: `apps/web/src/pages/github/actions/components/actions-list-view/repo-run-card.tsx`

### Steps

- [ ] **Step 1: Create RepoRunCard component**

Create `apps/web/src/pages/github/actions/components/actions-list-view/repo-run-card.tsx`:
```typescript
import { view, useService } from '@rabjs/react';
import { ActionsService, WorkflowRun } from '../../actions.service';
import { useState } from 'react';
import { ChevronDown, ChevronRight, Github, Clock, User, GitBranch } from 'lucide-react';

export const RepoRunCard = view(({ repoName, runs }: { repoName: string; runs: WorkflowRun[] }) => {
  const [expanded, setExpanded] = useState(false);
  const statusDot = getStatusDot(runs[0]?.status, runs[0]?.conclusion);

  return (
    <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-sm overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-700/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {statusDot}
          <span className="font-medium text-gray-900 dark:text-white">{repoName}</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-zinc-400">
          <span>{runs.length} runs</span>
          <span>{formatRelativeTime(runs[0]?.updated_at)}</span>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-gray-100 dark:border-zinc-700">
          {runs.slice(0, 10).map((run) => (
            <RunRow key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  );
});

function RunRow({ run }: { run: WorkflowRun }) {
  const statusDot = getStatusDot(run.status, run.conclusion);
  return (
    <a
      href={run.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-zinc-700/50 text-sm"
    >
      {statusDot}
      <span className="text-gray-700 dark:text-zinc-300">{run.workflow_name}</span>
      <span className="text-gray-400">#{run.run_number}</span>
      <span className="text-gray-400">•</span>
      <GitBranch className="w-3 h-3 text-gray-400" />
      <span className="text-gray-500">{run.head_branch}</span>
      <span className="text-gray-400">•</span>
      <User className="w-3 h-3 text-gray-400" />
      <span className="text-gray-500">{run.actor}</span>
      <span className="flex-1" />
      <span className="text-gray-400">{formatRelativeTime(run.updated_at)}</span>
    </a>
  );
}

function getStatusDot(status: string, conclusion: string | null) { /* return colored span */ }
function formatRelativeTime(dateStr: string) { /* e.g. "2 hours ago" */ }
```

- [ ] **Step 2: Create ActionsListView component**

Create `apps/web/src/pages/github/actions/components/actions-list-view/actions-list-view.tsx`:
```typescript
import { view, useService } from '@rabjs/react';
import { ActionsService } from '../../actions.service';
import { RepoRunCard } from './repo-run-card';

export const ActionsListView = view(() => {
  const actionsService = useService(ActionsService);
  const grouped = actionsService.groupedByRepo;
  const filteredRuns = actionsService.filteredRuns;

  if (filteredRuns.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-zinc-400">
        暂无 workflow runs
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Object.entries(grouped).map(([repoName, runs]) => (
        <RepoRunCard key={repoName} repoName={repoName} runs={runs} />
      ))}
    </div>
  );
});
```

- [ ] **Step 3: Create barrel export**

Create `apps/web/src/pages/github/actions/components/actions-list-view/index.tsx`:
```typescript
export { ActionsListView } from './actions-list-view';
export { RepoRunCard } from './repo-run-card';
```

- [ ] **Step 4: Wire into actions.tsx**

Add conditional rendering in actions.tsx when viewMode === 'list'.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/github/actions/components/actions-list-view/
git commit -m "feat(web): add Actions list view with repo grouping"
```

---

## Chunk 6: Timeline View

### Overview
Build timeline view showing all runs in reverse chronological order.

### Files
- Create: `apps/web/src/pages/github/actions/components/actions-timeline-view/index.tsx`
- Create: `apps/web/src/pages/github/actions/components/actions-timeline-view/actions-timeline-view.tsx`
- Create: `apps/web/src/pages/github/actions/components/actions-timeline-view/timeline-item.tsx`

### Steps

- [ ] **Step 1: Create TimelineItem component**

Create `apps/web/src/pages/github/actions/components/actions-timeline-view/timeline-item.tsx`:
```typescript
import { view } from '@rabjs/react';
import { WorkflowRun } from '../../actions.service';
import { Github, Clock, User, GitBranch, ExternalLink } from 'lucide-react';

export const TimelineItem = view(({ run }: { run: WorkflowRun }) => {
  const statusDot = getStatusDot(run.status, run.conclusion);

  return (
    <div className="flex gap-4 p-4 bg-white dark:bg-zinc-800 rounded-lg shadow-sm hover:-translate-y-0.5 transition-transform">
      <div className="flex-shrink-0">{statusDot}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Github className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {run.repository_full_name}
          </span>
          <span className="text-sm text-gray-500">/</span>
          <span className="text-sm text-gray-700 dark:text-zinc-300">{run.workflow_name}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-zinc-400">
          <span>#{run.run_number}</span>
          <span>•</span>
          <GitBranch className="w-3 h-3" />
          <span>{run.head_branch}</span>
          <span>•</span>
          <User className="w-3 h-3" />
          <span>{run.actor}</span>
          <span>•</span>
          <Clock className="w-3 h-3" />
          <span>{formatRelativeTime(run.updated_at)}</span>
        </div>
      </div>
      <a
        href={run.html_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
});
```

- [ ] **Step 2: Create ActionsTimelineView component**

Create `apps/web/src/pages/github/actions/components/actions-timeline-view/actions-timeline-view.tsx`:
```typescript
import { view, useService } from '@rabjs/react';
import { ActionsService } from '../../actions.service';
import { TimelineItem } from './timeline-item';

export const ActionsTimelineView = view(() => {
  const actionsService = useService(ActionsService);
  const filteredRuns = actionsService.filteredRuns;

  if (filteredRuns.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-zinc-400">
        暂无 workflow runs
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredRuns.map((run) => (
        <TimelineItem key={run.id} run={run} />
      ))}
    </div>
  );
});
```

- [ ] **Step 3: Create barrel export**

Create `apps/web/src/pages/github/actions/components/actions-timeline-view/index.tsx`

- [ ] **Step 4: Wire into actions.tsx**

Add conditional rendering when viewMode === 'timeline'.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/github/actions/components/actions-timeline-view/
git commit -m "feat(web): add Actions timeline view"
```

---

## Chunk 7: View Mode Toggle, Status Filter, Polling Controls

### Overview
Add the control bar with view mode toggle, status filter chips, and polling interval selector.

### Files
- Create: `apps/web/src/pages/github/actions/components/actions-controls/index.tsx`
- Create: `apps/web/src/pages/github/actions/components/actions-controls/actions-controls.tsx`

### Steps

- [ ] **Step 1: Create ActionsControls component**

Create `apps/web/src/pages/github/actions/components/actions-controls/actions-controls.tsx`:
```typescript
import { view, useService } from '@rabjs/react';
import { ActionsService, ViewMode, StatusFilter } from '../../actions.service';
import { List, Clock, RefreshCw } from 'lucide-react';

const POLL_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '30s', value: 30000 },
  { label: '1min', value: 60000 },
  { label: '5min', value: 300000 },
];

const FILTER_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Success', value: 'success' },
  { label: 'Failure', value: 'failure' },
  { label: 'Running', value: 'running' },
];

export const ActionsControls = view(() => {
  const actionsService = useService(ActionsService);

  const handleRefresh = () => {
    actionsService.loadRuns();
  };

  const handlePollChange = (value: number) => {
    actionsService.stopPolling();
    if (value > 0) {
      actionsService.startPolling(value);
    }
  };

  return (
    <div className="flex items-center justify-between bg-white dark:bg-zinc-800 rounded-lg px-4 py-3 shadow-sm">
      {/* View Mode Toggle */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-700 rounded-lg p-1">
        <button
          onClick={() => actionsService.setViewMode('list')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
            actionsService.viewMode === 'list'
              ? 'bg-white dark:bg-zinc-600 text-green-600 shadow-sm'
              : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'
          }`}
        >
          <List className="w-4 h-4" />
          列表
        </button>
        <button
          onClick={() => actionsService.setViewMode('timeline')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
            actionsService.viewMode === 'timeline'
              ? 'bg-white dark:bg-zinc-600 text-green-600 shadow-sm'
              : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          时间线
        </button>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => actionsService.setFilter(opt.value)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              actionsService.filter === opt.value
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium'
                : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Polling Controls */}
      <div className="flex items-center gap-2">
        <select
          value={actionsService.pollInterval}
          onChange={(e) => handlePollChange(Number(e.target.value))}
          className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-zinc-700 border-none rounded-lg focus:ring-2 focus:ring-green-500"
        >
          {POLL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button
          onClick={handleRefresh}
          disabled={actionsService.isLoading}
          className="p-2 text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${actionsService.isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
});
```

- [ ] **Step 2: Create barrel export**

Create `apps/web/src/pages/github/actions/components/actions-controls/index.tsx`

- [ ] **Step 3: Wire into actions.tsx**

Add `<ActionsControls />` above the view content area.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/github/actions/components/actions-controls/
git commit -m "feat(web): add Actions view controls, filters, and polling"
```

---

## Chunk 8: Polling Logic & Page Visibility Handling

### Overview
Implement the polling mechanism with proper cleanup and page visibility handling.

### Files
- Modify: `apps/web/src/pages/github/actions/actions.service.ts`

### Steps

- [ ] **Step 1: Implement polling in ActionsService**

Update `ActionsService` with:
```typescript
private pollTimer: ReturnType<typeof setInterval> | null = null;

startPolling(intervalMs: number): void {
  this.stopPolling(); // Clear any existing
  if (intervalMs <= 0) return;

  this.pollTimer = setInterval(async () => {
    await this.loadRuns();
  }, intervalMs);
}

stopPolling(): void {
  if (this.pollTimer) {
    clearInterval(this.pollTimer);
    this.pollTimer = null;
  }
}

async loadRuns(): Promise<void> {
  this.isLoading = true;
  this.error = null;
  try {
    const data = await githubApi.getWorkflowRuns();
    const newFailedIds = new Set(
      data.runs.filter(r => r.status === 'completed' && r.conclusion === 'failure').map(r => r.id)
    );

    // Detect new failures and notify
    for (const id of newFailedIds) {
      if (!this.previousFailedIds.has(id)) {
        const run = data.runs.find(r => r.id === id);
        if (run) this.notifyFailure(run);
      }
    }

    this.previousFailedIds = newFailedIds;
    this.runs = data.runs;
  } catch (err) {
    this.error = 'Failed to load workflow runs';
  } finally {
    this.isLoading = false;
  }
}

private notifyFailure(run: WorkflowRun): void {
  // Create notification via NotificationService
  notificationApi.create({
    type: 'github_action_failure',
    title: 'Workflow Failed',
    content: `[${run.repository_full_name}] ${run.workflow_name} (#${run.run_number}) failed`,
    data: { run_id: run.id, repo: run.repository_full_name },
  });
}
```

- [ ] **Step 2: Add visibility change handling in actions.tsx**

Modify `actions.tsx` to pause/resume polling based on page visibility:
```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      actionsService.stopPolling();
    } else if (actionsService.pollInterval > 0) {
      actionsService.startPolling(actionsService.pollInterval);
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    actionsService.stopPolling();
  };
}, []);
```

- [ ] **Step 3: Check notification API exists**

Check `apps/web/src/api/notification.ts` for `create` method, if not exist add it:
```typescript
create: async (data: { type: string; title: string; content: string; data?: Record<string, unknown> }) => {
  return request.post('/api/v1/notifications', data);
}
```

- [ ] **Step 4: Test polling manually**

Run dev, set poll interval to 30s, verify runs reload.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(web): add polling logic with visibility handling and failure notifications"
```

---

## Chunk 9: Final Integration & Polish

### Overview
Tie everything together, verify the complete flow, ensure design consistency.

### Steps

- [ ] **Step 1: Verify full flow end-to-end**

- Navigate to `/github/actions`
- Verify dashboard stats load
- Verify repo status grid shows
- Switch to list view, verify grouping
- Switch to timeline view, verify mixed order
- Apply status filter, verify filtering works
- Set poll interval, verify auto-refresh
- Verify error states and loading states

- [ ] **Step 2: Check design system compliance**

- Verify colors match spec (green=#22c55e, red=#ef4444, blue=#3b82f6, yellow=#eab308)
- Verify shadows are `shadow-sm`
- Verify hover transforms use `hover:-translate-y-0.5`
- Verify transitions use `transition-all duration-150`

- [ ] **Step 3: Add empty state**

If no repos configured or no runs, show appropriate empty state with guidance.

- [ ] **Step 4: Final build check**

Run: `pnpm build:web`
Expected: No errors

- [ ] **Step 5: Final commit**

```bash
git add -A && git commit -m "feat: complete GitHub Actions dashboard"
```

---

## File Summary

| Chunk | Files Created | Files Modified |
|-------|---------------|---------------|
| 1 | `apps/server/src/controllers/v1/github-actions.controller.ts`, `apps/server/src/services/github-actions.service.ts`, `packages/dto/src/github.ts` | `apps/server/src/controllers/v1/index.ts` |
| 2 | `apps/web/src/pages/github/actions/actions.service.ts`, `apps/web/src/pages/github/actions/index.tsx`, `apps/web/src/pages/github/actions/actions.tsx` | `apps/web/src/api/github.ts`, `apps/web/src/App.tsx` |
| 3 | `apps/web/src/pages/github/components/github-tabs.tsx` | `apps/web/src/pages/github/github.tsx` |
| 4 | `apps/web/src/pages/github/actions/components/actions-dashboard/` (4 files) | `apps/web/src/pages/github/actions/actions.tsx` |
| 5 | `apps/web/src/pages/github/actions/components/actions-list-view/` (3 files) | `apps/web/src/pages/github/actions/actions.tsx` |
| 6 | `apps/web/src/pages/github/actions/components/actions-timeline-view/` (3 files) | `apps/web/src/pages/github/actions/actions.tsx` |
| 7 | `apps/web/src/pages/github/actions/components/actions-controls/` (2 files) | `apps/web/src/pages/github/actions/actions.tsx` |
| 8 | — | `apps/web/src/pages/github/actions/actions.service.ts`, `apps/web/src/pages/github/actions/actions.tsx` |
