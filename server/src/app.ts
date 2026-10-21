import express, { Request, Response } from 'express';
import knex from 'knex';
import { signToken } from '../../lib/api/auth/jwt';
import { z } from 'zod';

// Initialize Knex with SQLite
export const db = knex({
  client: 'sqlite3',
  connection: { filename: './dev.db' },
  useNullAsDefault: true,
});

// Ensure users table exists (run once when app is imported)
// Table creation is now handled via Knex migrations. Ensure migrations are run before starting the server.


export const app = express();
app.use(express.json());

const SignUpSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

const SignInSchema = z.object({
  usernameOrEmail: z.string(),
  password: z.string(),
});

  const { username, email, password } = parse.data;
  try {
    const passwordHash = await import('../../lib/api/auth/password').then(m => m.hashPassword(password));
    const [id] = await db('users').insert({ username, email, password_hash: passwordHash });
    const token = signToken({ userId: id });
    res.status(201).json({ token, userId: id });
  } catch (e) {
    if (e && (e as any).code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'User already exists' });
    }
    console.error(e);
    res.status(500).json({ error: 'Internal server error' });
  }

  const { usernameOrEmail, password } = parse.data;
  const user = await db('users')
    .where((builder) =>
      builder.where('username', usernameOrEmail).orWhere('email', usernameOrEmail)
    )
    .first();
  // Compare hashed password
  const isMatch = user && await import('../../lib/api/auth/password').then(m => m.comparePassword(password, user.password_hash));
  if (!user || !isMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = signToken({ userId: user.id });
  res.json({ token, userId: user.id });
