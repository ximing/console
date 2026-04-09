/**
 * DTOs for GitHub global token settings
 */

/**
 * DTO for GitHub settings response
 */
export interface GithubSettingsDto {
  has_token: boolean;
  token_scope?: string; // e.g., "repo" if configured
  updated_at?: string;
}

/**
 * DTO for updating GitHub settings
 */
export interface UpdateGithubSettingsDto {
  pat?: string; // The GitHub PAT - will be encrypted server-side
}
