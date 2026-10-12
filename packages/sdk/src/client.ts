import { HttpClient, type HttpClientOptions, type RequestOptions } from './http';
import { AuthResource } from './resources/auth';
import { QuestionsResource } from './resources/questions';
import { QuizResource } from './resources/quiz';
import { LeaderboardResource } from './resources/leaderboard';
import { CommunityResource } from './resources/community';
import { GroupsResource } from './resources/groups';
import { DiscoveryResource } from './resources/discovery';
import { ProfileResource } from './resources/profile';

export type QuickQuizClientOptions = HttpClientOptions;

export class QuickQuizClient {
  readonly http: HttpClient;
  readonly auth: AuthResource;
  readonly questions: QuestionsResource;
  readonly quiz: QuizResource;
  readonly leaderboard: LeaderboardResource;
  readonly community: CommunityResource;
  readonly groups: GroupsResource;
  readonly discovery: DiscoveryResource;
  readonly profile: ProfileResource;

  constructor(options: QuickQuizClientOptions) {
    this.http = new HttpClient(options);
    this.auth = new AuthResource(this);
    this.questions = new QuestionsResource(this);
    this.quiz = new QuizResource(this);
    this.leaderboard = new LeaderboardResource(this);
    this.community = new CommunityResource(this);
    this.groups = new GroupsResource(this);
    this.discovery = new DiscoveryResource(this);
    this.profile = new ProfileResource(this);
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
