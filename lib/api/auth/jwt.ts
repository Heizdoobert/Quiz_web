// JWT utilities for the Web Quiz API
import jwt from 'jsonwebtoken';

const JWT_SECRET = (() => {
  if (process.env.NODE_ENV !== 'development' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET must be set in production');
  }
  return process.env.JWT_SECRET || 'dev-secret';
})();

export function signToken(payload: object, expiresIn: string = '1h'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyToken(token: string): object | null {
  try {
    return jwt.verify(token, JWT_SECRET) as object;
  } catch (err) {
    return null;
  }
}
