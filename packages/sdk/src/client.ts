import { HttpClient, type HttpClientOptions, type RequestOptions } from './http';

export type QuickQuizClientOptions = HttpClientOptions;

export class QuickQuizClient {
  readonly http: HttpClient;

  constructor(options: QuickQuizClientOptions) {
    this.http = new HttpClient(options);
  }

  /**
   * Update the stored auth token (called internally by auth.signIn or manually)
   */
  setToken(token: string | null): void {
    this.http.setToken(token);
  }

  /**
   * Get the currently configured auth token
   */
  getToken(): string | null {
    return this.http.getToken();
  }

  /**
   * Perform an HTTP request through the underlying HttpClient
   */
  request<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.http.request<T>(path, options);
  }
}
