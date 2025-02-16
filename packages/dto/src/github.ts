/**
 * DTOs for GitHub Actions
 */

/**
 * DTO for a single workflow run
 */
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

/**
 * DTO for workflow runs list response
 */
export interface WorkflowRunsResponseDto {
  runs: WorkflowRunDto[];
  total_count: number;
}
