import { Service } from 'typedi';
import { Octokit } from '@octokit/rest';
import { GithubRepoService } from './github-repo.service.js';
import { GithubSettingsService } from './github-settings.service.js';
import { logger } from '../utils/logger.js';

interface WorkflowRunResult {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  workflow_name: string;
  repository: string;
  repository_full_name: string;
  head_branch: string | null;
  event: string;
  actor: string;
  created_at: string;
  updated_at: string;
  run_number: number;
  run_attempt: number;
  html_url: string;
}

@Service()
export class GithubActionsService {
  constructor(
    private githubRepoService: GithubRepoService,
    private githubSettingsService: GithubSettingsService
  ) {}

  async getWorkflowRuns(userId: string, params?: { status?: string; per_page?: number }): Promise<WorkflowRunResult[]> {
    // 1. Get all repos for user
    const repos = await this.githubRepoService.getRepos(userId);

    // 2. For each repo, get decrypted PAT and fetch workflow runs
    const allRuns: WorkflowRunResult[] = [];

    for (const repo of repos) {
      try {
        const token = await this.githubRepoService.getRepoToken(repo.id, userId);
        if (!token) continue;

        const octokit = new Octokit({ auth: token });
        const [owner, repoName] = repo.fullName.split('/');

        const response = await octokit.actions.listWorkflowRunsForRepo({
          owner,
          repo: repoName,
          per_page: params?.per_page || 30,
          ...(params?.status && params.status !== 'all' && { status: params.status }),
        });

        const runs: WorkflowRunResult[] = response.data.workflow_runs.map((run) => ({
          id: run.id,
          name: run.name,
          status: run.status,
          conclusion: run.conclusion,
          workflow_name: run.name,
          repository: repo.name,
          repository_full_name: repo.fullName,
          head_branch: run.head_branch,
          event: run.event,
          actor: run.actor?.login || run.actor?.name || 'unknown',
          created_at: run.created_at,
          updated_at: run.updated_at,
          run_number: run.run_number,
          run_attempt: run.run_attempt,
          html_url: run.html_url,
        }));

        allRuns.push(...runs);
      } catch (error) {
        logger.error(`Error fetching workflow runs for ${repo.fullName}:`, error);
      }
    }

    // 3. Sort by updated_at descending
    allRuns.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return allRuns;
  }

  async getWorkflowRunsForAllRepos(
    userId: string,
    params?: { status?: string; per_page?: number }
  ): Promise<WorkflowRunResult[]> {
    // 1. Get the global GitHub token
    const token = await this.githubSettingsService.getDecryptedToken(userId);
    if (!token) {
      throw new Error('GitHub token not configured');
    }

    // 2. Create Octokit with the global token
    const octokit = new Octokit({ auth: token });

    // 3. Get all user repos
    const reposResponse = await octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated',
      direction: 'desc',
    });

    // 4. For each repo, get workflow runs
    const allRuns: WorkflowRunResult[] = [];
    const repos = reposResponse.data.slice(0, 20); // Limit to top 20 by activity

    for (const repo of repos) {
      try {
        const runsResponse = await octokit.actions.listWorkflowRunsForRepo({
          owner: repo.owner.login,
          repo: repo.name,
          per_page: params?.per_page || 10, // Just last 10 runs per repo for dashboard
        });

        const runs: WorkflowRunResult[] = runsResponse.data.workflow_runs.map((run) => ({
          id: run.id,
          name: run.name || 'Unknown',
          status: run.status || 'unknown',
          conclusion: run.conclusion,
          workflow_name: run.name || 'Unknown',
          repository: repo.name,
          repository_full_name: repo.full_name,
          head_branch: run.head_branch,
          event: run.event,
          actor: run.actor?.login || 'unknown',
          created_at: run.created_at,
          updated_at: run.updated_at,
          run_number: run.run_number,
          run_attempt: run.run_attempt,
          html_url: run.html_url,
        }));

        allRuns.push(...runs);
      } catch (error) {
        // Skip repos we don't have access to
        logger.debug(`Skipping repo ${repo.full_name}: no access or error`);
      }
    }

    // 5. Sort by updated_at descending
    allRuns.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return allRuns;
  }
}
