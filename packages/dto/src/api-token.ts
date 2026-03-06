/**
 * DTOs for user API token management
 */

/**
 * DTO for creating an API token
 */
export interface CreateApiTokenDto {
  name: string;
  expiresInDays?: number; // Optional expiration in days
}

/**
 * DTO for API token response (includes plaintext token - only shown once)
 */
export interface ApiTokenDto {
  id: string;
  name: string;
  token?: string; // Only included when creating
  prefix: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
}

/**
 * DTO for API token list response
 */
export interface ApiTokenListDto {
  tokens: ApiTokenDto[];
}
