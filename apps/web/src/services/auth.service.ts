import { Service } from '@rabjs/react';
import type { LoginDto, RegisterDto, UserInfoDto } from '@x-console/dto';
import * as authApi from '../api/auth';
import * as userApi from '../api/user';

/**
 * Authentication Service
 * Manages user authentication state and operations
 * Uses HTTP-only cookies for token storage
 */
export class AuthService extends Service {
  // State - token is no longer stored in localStorage, kept in memory only
  user: UserInfoDto | null = null;
  isAuthenticated = false;

  // Socket.IO service reference (lazy loaded to avoid circular dependency)
  private _socketIOService: unknown = null;

  private async getSocketIOService() {
    if (!this._socketIOService) {
      const module = await import('./socket-io.service');
      this._socketIOService = module.socketIOService;
    }
    return this._socketIOService as { connect(): void; disconnect(): void };
  }

  constructor() {
    super();
    // Load auth state from localStorage on init (only user info)
    this.loadAuthState();
  }

  /**
   * Load authentication state from localStorage (user info only, no token)
   */
  loadAuthState() {
    const savedUser = localStorage.getItem('aimo_user');

    if (savedUser) {
      try {
        this.user = JSON.parse(savedUser);
        this.isAuthenticated = true;
      } catch (error) {
        console.error('Failed to parse saved user data:', error);
        this.clearAuthState();
      }
    }
  }

  /**
   * Save authentication state (user info only, token is in HTTP-only cookie)
   * @param _token - Token from server response (kept for API compatibility, stored in cookie)
   */
  saveAuthState(_token: string, user: UserInfoDto) {
    // Token is now stored in HTTP-only cookie, not in localStorage
    this.user = user;
    this.isAuthenticated = true;

    localStorage.setItem('aimo_user', JSON.stringify(user));
  }

  /**
   * Clear authentication state
   */
  clearAuthState() {
    this.user = null;
    this.isAuthenticated = false;

    localStorage.removeItem('aimo_user');
  }

  /**
   * Login with email and password
   */
  async login(data: LoginDto) {
    try {
      const response = await authApi.login(data);

      if (response.code === 0 && response.data) {
        this.saveAuthState(response.data.token, response.data.user);
        // Connect to Socket.IO after successful login
        (await this.getSocketIOService())?.connect();
        return { success: true };
      } else {
        return {
          success: false,
          message: response.msg || 'Login failed',
        };
      }
    } catch (error: unknown) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  /**
   * Register a new user
   */
  async register(data: RegisterDto) {
    try {
      const response = await authApi.register(data);

      if (response.code === 0) {
        return { success: true };
      } else {
        return {
          success: false,
          message: 'Registration failed',
        };
      }
    } catch (error: unknown) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  /**
   * Logout current user
   */
  async logout() {
    try {
      // Call logout API to clear cookie on server
      await authApi.logout();
    } catch (error) {
      console.error('Logout API error:', error);
    }

    // Disconnect from Socket.IO before clearing auth state
    (await this.getSocketIOService())?.disconnect();
    this.clearAuthState();
  }

  /**
   * Check if user is authenticated and fetch user info
   * Token is sent automatically via cookie (withCredentials: true)
   */
  async checkAuth() {
    // Check if we have user info in localStorage first
    if (!this.user) {
      return false;
    }

    try {
      const user = await userApi.getUserInfo();

      if (user) {
        this.user = user;
        this.isAuthenticated = true;
        localStorage.setItem('aimo_user', JSON.stringify(user));
        // Connect to Socket.IO for existing authenticated session
        (await this.getSocketIOService())?.connect();
        return true;
      } else {
        this.clearAuthState();
        return false;
      }
    } catch (error: unknown) {
      console.error('Check auth error:', error);
      this.clearAuthState();
      return false;
    }
  }
}

// Export singleton instance for use in non-React contexts (e.g., Socket.IO service)
export const authService = new AuthService();
