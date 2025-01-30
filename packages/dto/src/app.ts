/**
 * App and AppVersion DTOs for app version management
 */

/**
 * App DTO - represents an application
 */
export interface AppDto {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * AppVersion DTO - represents a version of an application
 */
export interface AppVersionDto {
  id: string;
  appId: string;
  version: string;
  buildNumber: string;
  changelog: string | null;
  androidUrl: string | null;
  iosUrl: string | null;
  isLatest: boolean;
  createdAt: string;
}

/**
 * DTO for creating a new app
 */
export interface CreateAppDto {
  name: string;
  description?: string;
}

/**
 * DTO for updating an existing app
 */
export interface UpdateAppDto {
  name?: string;
  description?: string;
}

/**
 * DTO for creating a new app version
 */
export interface CreateVersionDto {
  version: string;
  buildNumber: string;
  changelog?: string;
  androidUrl?: string;
  iosUrl?: string;
  isLatest?: boolean;
}

/**
 * DTO for updating an existing app version
 */
export interface UpdateVersionDto {
  version?: string;
  buildNumber?: string;
  changelog?: string;
  androidUrl?: string;
  iosUrl?: string;
  isLatest?: boolean;
}

/**
 * DTO for app list response
 */
export interface AppListResult {
  apps: AppDto[];
  total: number;
}

/**
 * DTO for version list response
 */
export interface VersionListResult {
  versions: AppVersionDto[];
  total: number;
}
