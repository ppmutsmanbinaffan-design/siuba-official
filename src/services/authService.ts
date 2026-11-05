import { User, UserRole } from '../types';
import { apiClient } from './apiClient';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  status: AuthStatus;
  user: User | null;
  token: string | null;
  error: string | null;
}

type AuthListener = (state: AuthState) => void;

const AUTH_TOKEN_KEY = 'siuba_auth_token';
const AUTH_USER_KEY = 'siuba_auth_user';

class AuthService {
  private state: AuthState = {
    status: 'loading',
    user: null,
    token: null,
    error: null,
  };

  private listeners: Set<AuthListener> = new Set();
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private async init() {
    if (typeof window === 'undefined') return;

    try {
      const storedToken = localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY);

      if (storedToken) {
        // Set loading state and client token header
        this.state = {
          status: 'loading',
          user: null,
          token: storedToken,
          error: null,
        };
        apiClient.setToken(storedToken);
        this.notify();

        // Revalidate token with backend /me
        await this.revalidateSession(storedToken);
      } else {
        // No stored token -> Unauthenticated initial state
        this.state = {
          status: 'unauthenticated',
          user: null,
          token: null,
          error: null,
        };
        this.notify();
      }
    } catch {
      this.state = {
        status: 'unauthenticated',
        user: null,
        token: null,
        error: null,
      };
      this.notify();
    } finally {
      this.isInitialized = true;
    }
  }

  /**
   * Validates stored token with backend /api/v1/auth/me to retrieve fresh user and permissions.
   */
  public async revalidateSession(token: string): Promise<boolean> {
    try {
      const response = await fetch('/api/v1/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data && data.success && data.user) {
        const user = data.user as User;
        this.state = {
          status: 'authenticated',
          user,
          token,
          error: null,
        };
        apiClient.setToken(token);
        this.notify();
        return true;
      }

      // Token expired, revoked, or user inactive -> Clear session
      this.clearStorage();
      this.state = {
        status: 'unauthenticated',
        user: null,
        token: null,
        error: null,
      };
      apiClient.setToken(null);
      this.notify();
      return false;
    } catch (err) {
      // Backend unreachable -> Controlled unauthenticated state
      this.state = {
        status: 'unauthenticated',
        user: null,
        token: null,
        error: 'Layanan autentikasi backend tidak dapat dihubungi.',
      };
      this.notify();
      return false;
    }
  }

  private clearStorage() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);
  }

  public subscribe(listener: AuthListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  public getState(): AuthState {
    return this.state;
  }

  public isAuthenticated(): boolean {
    return this.state.status === 'authenticated' && this.state.user !== null;
  }

  /**
   * Authenticate strictly via backend API.
   * NEVER fallback to local mock users or hardcoded credentials.
   */
  public async login(
    usernameOrEmail: string,
    password: string,
    rememberMe: boolean = true
  ): Promise<{ success: boolean; user?: User; message?: string }> {
    this.state = {
      ...this.state,
      status: 'loading',
      error: null,
    };
    this.notify();

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          username: usernameOrEmail.trim(),
          password: password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data && data.success && data.user && data.token) {
        const user = data.user as User;
        const token = data.token as string;
        this.setAuthenticatedUser(user, token, rememberMe);
        return { success: true, user };
      }

      // Handle specific HTTP error statuses from backend
      const errorMessage = data?.message || (
        response.status === 403 
          ? 'Akun tidak aktif.' 
          : 'Username atau password tidak sesuai.'
      );

      this.state = {
        status: 'unauthenticated',
        user: null,
        token: null,
        error: errorMessage,
      };
      this.notify();
      return { success: false, message: errorMessage };
    } catch (err: any) {
      // Backend unavailable / Network connection error -> Strictly fail without local fallback
      const errorMsg = 'Layanan autentikasi backend tidak dapat dihubungi. Silakan periksa koneksi server.';
      this.state = {
        status: 'unauthenticated',
        user: null,
        token: null,
        error: errorMsg,
      };
      this.notify();
      return { success: false, message: errorMsg };
    }
  }

  public setAuthenticatedUser(user: User, token: string, rememberMe: boolean = true): void {
    const storage = rememberMe ? localStorage : sessionStorage;
    
    // Clear other storage to avoid conflict
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_USER_KEY);

    storage.setItem(AUTH_TOKEN_KEY, token);
    storage.setItem(AUTH_USER_KEY, JSON.stringify(user));

    apiClient.setToken(token);

    this.state = {
      status: 'authenticated',
      user,
      token,
      error: null,
    };
    this.notify();
  }

  public switchRole(role: UserRole, availableUsers: User[] = []): void {
    if (!this.state.user) return;
    const existing = availableUsers.find((u) => u.role === role);
    if (existing) {
      this.setAuthenticatedUser(existing, this.state.token || `dev_token_${existing.id}`, true);
    }
  }

  public async logout(): Promise<void> {
    try {
      if (this.state.token) {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: apiClient.getHeaders(),
        }).catch(() => {});
      }
    } catch {
      // ignore
    } finally {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.removeItem(AUTH_USER_KEY);
      apiClient.setToken(null);

      this.state = {
        status: 'unauthenticated',
        user: null,
        token: null,
        error: null,
      };
      this.notify();
    }
  }
}

export const authService = new AuthService();
