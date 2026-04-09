import type {
  CreateGithubRepoDto,
  UpdateGithubRepoDto,
  GithubRepoDto,
  GithubRepoListDto,
  GithubRepoTokenDto,
  WorkflowRunsResponseDto,
  GithubSettingsDto,
} from '@x-console/dto';
import request from '../utils/request';

interface ApiResponse<T> {
  code: number;
  data: T;
  msg?: string;
}

/**
 * GitHub repository API endpoints
 */
export const githubApi = {
  /**
   * Get all repositories for current user
   */
  getRepos: async (): Promise<GithubRepoListDto> => {
    const response = await request.get<unknown, ApiResponse<GithubRepoListDto>>(
      '/api/v1/github/repos'
    );
    return response.data;
  },

  /**
   * Get a single repository by ID
   */
  getRepo: async (id: string): Promise<GithubRepoDto> => {
    const response = await request.get<unknown, ApiResponse<GithubRepoDto>>(
      `/api/v1/github/repos/${id}`
    );
    return response.data;
  },

  /**
   * Add a new repository (PAT will be encrypted)
   */
  addRepo: async (data: CreateGithubRepoDto): Promise<GithubRepoDto> => {
    const response = await request.post<CreateGithubRepoDto, ApiResponse<GithubRepoDto>>(
      '/api/v1/github/repos',
      data
    );
    return response.data;
  },

  /**
   * Update a repository
   */
  updateRepo: async (id: string, data: UpdateGithubRepoDto): Promise<GithubRepoDto> => {
    const response = await request.put<UpdateGithubRepoDto, ApiResponse<GithubRepoDto>>(
      `/api/v1/github/repos/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a repository
   */
  deleteRepo: async (id: string): Promise<{ deleted: boolean }> => {
    const response = await request.delete<unknown, ApiResponse<{ deleted: boolean }>>(
      `/api/v1/github/repos/${id}`
    );
    return response.data;
  },

  /**
   * Get decrypted PAT for a repository
   */
  getToken: async (id: string): Promise<GithubRepoTokenDto> => {
    const response = await request.get<unknown, ApiResponse<GithubRepoTokenDto>>(
      `/api/v1/github/repos/${id}/token`
    );
    return response.data;
  },

  /**
   * Get workflow runs for all repositories
   */
  getWorkflowRuns: async (params?: { status?: string }): Promise<WorkflowRunsResponseDto> => {
    const response = await request.get<unknown, ApiResponse<WorkflowRunsResponseDto>>(
      '/api/v1/github/actions/runs',
      { params }
    );
    return response.data;
  },

  /**
   * Get GitHub global token settings
   */
  getGithubSettings: async (): Promise<GithubSettingsDto> => {
    const response = await request.get<unknown, ApiResponse<GithubSettingsDto>>(
      '/api/v1/github/settings'
    );
    return response.data;
  },

  /**
   * Update GitHub global token settings
   */
  updateGithubSettings: async (data: { pat?: string }): Promise<GithubSettingsDto> => {
    const response = await request.put<{ pat?: string }, ApiResponse<GithubSettingsDto>>(
      '/api/v1/github/settings',
      data
    );
    return response.data;
  },
};
