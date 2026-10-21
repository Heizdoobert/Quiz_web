import type { AuthResult } from '@/lib/services/auth/credentials';

export type { AuthResult };

export interface VerifyCodeOptions {
  issueToken?: boolean;
  type?: 'email' | 'signup';
}
