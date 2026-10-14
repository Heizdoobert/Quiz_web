# sdk/src/client/auth.ts
lines:292 exports:signUp,signIn,signInWithGoogle,requestEmailCode,verifyEmailCode,getSession,session,signOut,AuthResource
---
import { isClient, getDefaultClient, type ClientLike } from './http';
import type { QuickQuizClient } from './client';
import type { AuthResult, AuthSession, VerifyEmailResult } from '../types';

/**
 * Register a new user account with username and password.
 * On success, updates the client's auth token if supported.
 */
export async function signUp(
  arg1: ClientLike | string | { username: string; password: string; client?: ClientLike },
  arg2?: string | { username: string; password: string },
  arg3?: string
): Promise<AuthResult> {
  let client: ClientLike;
  let username: string;
  let password = '';

  if (isClient(arg1)) {
    client = arg1;
    if (typeof arg2 === 'string') {
      username = arg2;
      password = arg3 ?? '';
    } else {
      username = arg2?.username ?? '';
      password = arg2?.password ?? '';
    }
  } else if (typeof arg1 === 'string') {
    client = getDefaultClient();
    username = arg1;
    password = typeof arg2 === 'string' ? arg2 : '';
  } else {
    client = arg1?.client ?? getDefaultClient();
    username = arg1.username;
    password = arg1.password;
  }

  const res = await client.request<AuthResult>('/v1/auth/signup', {
    method: 'POST',
    body: { username, password },
  });
