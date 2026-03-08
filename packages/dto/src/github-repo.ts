/**
 * DTOs for GitHub repository management
 */

/**
 * DTO for creating a GitHub repository
 */
export interface CreateGithubRepoDto {
  name: string;
  full_name: string;
  pat: string; // Plaintext PAT - will be encrypted before storing
}

/**
 * DTO for updating a GitHub repository
 */
export interface UpdateGithubRepoDto {
  name?: string;
  full_name?: string;
  pat?: string; // Optional - if provided, will be re-encrypted
}

/**
 * DTO for GitHub repository response (without decrypted PAT)
 */
export interface GithubRepoDto {
  id: string;
  name: string;
  full_name: string;
  created_at: string;
  updated_at: string;
}

/**
 * DTO for GitHub repository list response
 */
export interface GithubRepoListDto {
  repos: GithubRepoDto[];
}

/**
 * DTO for GitHub repository token response (includes decrypted PAT)
 */
export interface GithubRepoTokenDto {
  id: string;
  pat: string; // Decrypted PAT
}
