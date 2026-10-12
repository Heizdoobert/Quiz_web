import type { QuickQuizClient } from '../client';
import type { AuthResult, AuthSession, VerifyEmailResult } from '../types';

export class AuthResource {
  constructor(private readonly client: QuickQuizClient) {}

  /**
   * Register a new user account with username and password.
   * On success, updates the client's auth token.
   */
  async signUp(
    usernameOrParams: string | { username: string; password: string },
    maybePassword?: string
  ): Promise<AuthResult> {
    const payload =
      typeof usernameOrParams === 'string'
        ? { username: usernameOrParams, password: maybePassword ?? '' }
        : usernameOrParams;

    const res = await this.client.request<AuthResult>('/v1/auth/signup', {
      method: 'POST',
      body: payload,
    });
    this.client.setToken(res.token);
    return res;
  }

  /**
   * Sign in with username and password.
   * On success, updates the client's auth token.
   */
  async signIn(
    usernameOrParams: string | { username: string; password: string },
    maybePassword?: string
  ): Promise<AuthResult> {
    const payload =
      typeof usernameOrParams === 'string'
        ? { username: usernameOrParams, password: maybePassword ?? '' }
        : usernameOrParams;

    const res = await this.client.request<AuthResult>('/v1/auth/signin', {
      method: 'POST',
      body: payload,
    });
    this.client.setToken(res.token);
    return res;
  }

  /**
   * Sign in using a Google OAuth ID token.
   * On success, updates the client's auth token.
   */
  async signInWithGoogle(idTokenOrParams: string | { idToken: string }): Promise<AuthResult> {
    const payload =
      typeof idTokenOrParams === 'string' ? { idToken: idTokenOrParams } : idTokenOrParams;

    const res = await this.client.request<AuthResult>('/v1/auth/signin/google', {
      method: 'POST',
      body: payload,
    });
    this.client.setToken(res.token);
    return res;
  }

  /**
   * Request a single-use verification code sent via email.
   */
  async requestEmailCode(emailOrParams: string | { email: string }): Promise<{ sent: boolean }> {
    const payload =
      typeof emailOrParams === 'string' ? { email: emailOrParams } : emailOrParams;

    return this.client.request<{ sent: boolean }>('/v1/auth/email/request', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * Verify an email code and establish a session.
   * On success, updates the client's auth token.
   */
  async verifyEmailCode(
    emailOrParams: string | { email: string; code: string },
    maybeCode?: string
  ): Promise<VerifyEmailResult> {
    const payload =
      typeof emailOrParams === 'string'
        ? { email: emailOrParams, code: maybeCode ?? '' }
        : emailOrParams;

    const res = await this.client.request<VerifyEmailResult>('/v1/auth/email/verify', {
      method: 'POST',
      body: payload,
    });
    if (res.token) {
      this.client.setToken(res.token);
    }
    return res;
  }

  /**
   * Get current authenticated user session information.
   */
  async session(): Promise<AuthSession> {
    return this.client.request<AuthSession>('/v1/auth/session', {
      method: 'GET',
    });
  }

  /**
   * Terminate current session and clear stored auth token.
   */
  async signOut(): Promise<{ ok: boolean }> {
    try {
      return await this.client.request<{ ok: boolean }>('/v1/auth/signout', {
        method: 'POST',
      });
    } finally {
      this.client.setToken(null);
    }
  }
}
