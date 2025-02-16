import { Service } from 'typedi';
import { Octokit } from '@octokit/rest';
import { GithubRepoService } from './github-repo.service.js';
import { logger } from '../utils/logger.js';

@Service()
export class GithubActionsService {
  constructor(private githubRepoService: GithubRepoService) {}

  async getWorkflowRuns(userId: string, params?: { status?: string; per_page?: number }): Promise<any[]> {
    // 1. Get all repos for user
    const repos = await this.githubRepoService.getRepos(userId);

    // 2. For each repo, get decrypted PAT and fetch workflow runs
    const allRuns: any[] = [];

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
          ...(params?.status && params.status !== 'all' && { status: params.status as any }),
        });

        const runs = response.data.workflow_runs.map((run: any) => ({
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
}
