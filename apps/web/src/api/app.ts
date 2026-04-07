import type {
  AppDto,
  AppListDto,
  CreateAppDto,
  UpdateAppDto,
  AppVersionDto,
  VersionListDto,
  CreateVersionDto,
  UpdateVersionDto,
} from '@x-console/dto';
import request from '../utils/request';

interface ApiResponse<T> {
  code: number;
  data: T;
  msg?: string;
}

/**
 * App API endpoints
 */
export const appApi = {
  /**
   * Get all apps
   */
  getApps: async (): Promise<AppListDto> => {
    const response = await request.get<unknown, ApiResponse<AppListDto>>('/api/v1/apps');
    return response.data;
  },

  /**
   * Get a single app by ID
   */
  getApp: async (id: string): Promise<AppDto> => {
    const response = await request.get<unknown, ApiResponse<AppDto>>(`/api/v1/apps/${id}`);
    return response.data;
  },

  /**
   * Create a new app
   */
  createApp: async (data: CreateAppDto): Promise<AppDto> => {
    const response = await request.post<CreateAppDto, ApiResponse<AppDto>>('/api/v1/apps', data);
    return response.data;
  },

  /**
   * Update an app
   */
  updateApp: async (id: string, data: UpdateAppDto): Promise<AppDto> => {
    const response = await request.put<UpdateAppDto, ApiResponse<AppDto>>(
      `/api/v1/apps/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete an app
   */
  deleteApp: async (id: string): Promise<{ deleted: boolean }> => {
    const response = await request.delete<unknown, ApiResponse<{ deleted: boolean }>>(
      `/api/v1/apps/${id}`
    );
    return response.data;
  },

  // Versions

  /**
   * Get all versions for an app
   */
  getVersions: async (appId: string): Promise<VersionListDto> => {
    const response = await request.get<unknown, ApiResponse<VersionListDto>>(
      `/api/v1/apps/${appId}/versions`
    );
    return response.data;
  },

  /**
   * Get a single version by ID
   */
  getVersion: async (appId: string, versionId: string): Promise<AppVersionDto> => {
    const response = await request.get<unknown, ApiResponse<AppVersionDto>>(
      `/api/v1/apps/${appId}/versions/${versionId}`
    );
    return response.data;
  },

  /**
   * Create a new version
   */
  createVersion: async (appId: string, data: CreateVersionDto): Promise<AppVersionDto> => {
    const response = await request.post<CreateVersionDto, ApiResponse<AppVersionDto>>(
      `/api/v1/apps/${appId}/versions`,
      data
    );
    return response.data;
  },

  /**
   * Update a version
   */
  updateVersion: async (
    appId: string,
    versionId: string,
    data: UpdateVersionDto
  ): Promise<AppVersionDto> => {
    const response = await request.put<UpdateVersionDto, ApiResponse<AppVersionDto>>(
      `/api/v1/apps/${appId}/versions/${versionId}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a version
   */
  deleteVersion: async (appId: string, versionId: string): Promise<{ deleted: boolean }> => {
    const response = await request.delete<unknown, ApiResponse<{ deleted: boolean }>>(
      `/api/v1/apps/${appId}/versions/${versionId}`
    );
    return response.data;
  },
};
