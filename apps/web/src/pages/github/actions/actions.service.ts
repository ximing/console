import { Service } from '@rabjs/react';
import { githubApi } from '../../../api/github';
import { notificationApi } from '../../../api/notification';
import type { WorkflowRunDto } from '@x-console/dto';

export type ViewMode = 'list' | 'timeline';
export type StatusFilter = 'all' | 'success' | 'failure' | 'running';

export interface WorkflowRun extends WorkflowRunDto {}

export class ActionsService extends Service {
  runs: WorkflowRun[] = [];
  isLoading = false;
  error: string | null = null;
  viewMode: ViewMode = 'list';
  filter: StatusFilter = 'all';
  pollInterval: number = 0;
  hasToken: boolean = false;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private previousFailedIds: Set<number> = new Set();

  get stats() {
    return {
      total: this.runs.length,
      success: this.runs.filter(r => r.status === 'completed' && r.conclusion === 'success').length,
      failure: this.runs.filter(r => r.status === 'completed' && r.conclusion === 'failure').length,
      running: this.runs.filter(r => r.status === 'in_progress' || r.status === 'queued').length,
    };
  }

  get filteredRuns(): WorkflowRun[] {
    switch (this.filter) {
      case 'success':
        return this.runs.filter(r => r.status === 'completed' && r.conclusion === 'success');
      case 'failure':
        return this.runs.filter(r => r.status === 'completed' && r.conclusion === 'failure');
      case 'running':
        return this.runs.filter(r => r.status === 'in_progress' || r.status === 'queued');
      default:
        return this.runs;
    }
  }

  get groupedByRepo(): Record<string, WorkflowRun[]> {
    const groups: Record<string, WorkflowRun[]> = {};
    for (const run of this.filteredRuns) {
      if (!groups[run.repository_full_name]) {
        groups[run.repository_full_name] = [];
      }
      groups[run.repository_full_name].push(run);
    }
    // Sort runs within each group by updated_at descending
    for (const repo in groups) {
      groups[repo].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
    return groups;
  }

  async loadRuns(): Promise<void> {
    this.isLoading = true;
    this.error = null;

    try {
      // First check if token is configured
      const settings = await githubApi.getGithubSettings();
      this.hasToken = settings.has_token;

      if (!this.hasToken) {
        this.isLoading = false;
        return;
      }

      const data = await githubApi.getWorkflowRuns();

      // Detect new failures
      const newFailedIds = new Set<number>(
        data.runs.filter((r) => r.status === 'completed' && r.conclusion === 'failure').map((r) => r.id as number)
      );

      for (const id of newFailedIds) {
        if (!this.previousFailedIds.has(id)) {
          const run = data.runs.find((r) => r.id === id);
          if (run) {
            try {
              await notificationApi.create({
                type: 'github_action_failure',
                title: 'Workflow Failed',
                content: `[${run.repository_full_name}] ${run.workflow_name} (#${run.run_number}) failed`,
                data: { run_id: run.id, repo: run.repository_full_name },
              });
            } catch (e) {
              console.error('Failed to create notification:', e);
            }
          }
        }
      }

      this.previousFailedIds = newFailedIds;
      this.runs = data.runs;
    } catch (err: any) {
      this.error = err.message || 'Failed to load workflow runs';
    } finally {
      this.isLoading = false;
    }
  }

  startPolling(intervalMs: number): void {
    this.stopPolling();
    if (intervalMs <= 0) return;
    this.pollTimer = setInterval(() => {
      this.loadRuns();
    }, intervalMs);
  }

  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
  }

  setFilter(filter: StatusFilter): void {
    this.filter = filter;
  }
}