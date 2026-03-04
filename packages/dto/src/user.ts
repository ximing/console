/**
 * User DTOs
 */

/**
 * User basic information DTO
 * Used for returning user info after login
 */
export interface UserInfoDto {
  /** User unique identifier */
  id: string;
  /** User email */
  email: string;
  /** Username */
  username: string;
  /** User avatar URL */
  avatar?: string;
}

/**
 * Update user info DTO
 */
export interface UpdateUserDto {
  /** Username */
  username?: string;
}
