import { Service } from '@rabjs/react';
import type { LoginDto, RegisterDto, UserInfoDto } from '@aimo-console/dto';
import * as authApi from '../api/auth';
import * as userApi from '../api/user';
import type { SocketIOService } from './socket-io.service';

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
  private _socketIOService: SocketIOService | null = null;
  private get socketIOService(): SocketIOService | null {
    if (!this._socketIOService) {
      // Lazy load to avoid circular dependency
      import('./socket-io.service').then((module) => {
        this._socketIOService = module.socketIOService;
      });
    }
    return this._socketIOService;
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
        this._socketIOService?.connect();
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
  logout() {
    // Disconnect from Socket.IO before clearing auth state
    this._socketIOService?.disconnect();
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
        this._socketIOService?.connect();
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
