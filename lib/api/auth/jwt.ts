// JWT utilities for the Web Quiz API
import { sign, verify } from 'jsonwebtoken';

const JWT_SECRET = (() => {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in production');
  }
  return process.env.JWT_SECRET || 'dev-secret';
})();

/**
 * Sign a JWT token.
 * @param payload - The payload to embed in the token.
 * @param expiresIn - Expiration time (default '1h').
 */
export function signToken(payload: object, expiresIn: string = '1h'): string {
  return sign(payload, JWT_SECRET, { expiresIn } as any);
}

/** Verify a JWT token and return the decoded payload or null on failure. */
export function verifyToken(token: string): object | null {
  try {
    return verify(token, JWT_SECRET) as object;
  } catch {
    return null;
  }
}
