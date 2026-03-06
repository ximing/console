import { Service } from '@rabjs/react';
import type { LoginDto, RegisterDto, UserInfoDto } from '@aimo-console/dto';
import * as authApi from '../api/auth';
import * as userApi from '../api/user';

/**
 * Authentication Service
 * Manages user authentication state and operations
 */
export class AuthService extends Service {
  // State
  token: string | null = null;
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
    // Load auth state from localStorage on init
    this.loadAuthState();
  }

  /**
   * Load authentication state from localStorage
   */
  loadAuthState() {
    const savedToken = localStorage.getItem('aimo_token');
    const savedUser = localStorage.getItem('aimo_user');

    if (savedToken && savedUser) {
      try {
        this.token = savedToken;
        this.user = JSON.parse(savedUser);
        this.isAuthenticated = true;
      } catch (error) {
        console.error('Failed to parse saved user data:', error);
        this.clearAuthState();
      }
    }
  }

  /**
   * Save authentication state to localStorage
   */
  saveAuthState(token: string, user: UserInfoDto) {
    this.token = token;
    this.user = user;
    this.isAuthenticated = true;

    localStorage.setItem('aimo_token', token);
    localStorage.setItem('aimo_user', JSON.stringify(user));
  }

  /**
   * Clear authentication state
   */
  clearAuthState() {
    this.token = null;
    this.user = null;
    this.isAuthenticated = false;

    localStorage.removeItem('aimo_token');
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
    // Disconnect from Socket.IO before clearing auth state
    (await this.getSocketIOService())?.disconnect();
    this.clearAuthState();
  }

  /**
   * Check if user is authenticated and fetch user info
   */
  async checkAuth() {
    if (!this.token) {
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
