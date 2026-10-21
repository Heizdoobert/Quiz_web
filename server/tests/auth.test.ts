// tests/auth.test.ts
import request from 'supertest';
import { app, db } from '../../server/src/app';
import { hashPassword } from '../../lib/api/auth/password';

describe('Auth API', () => {
  beforeAll(async () => {
    // Run migrations
    await db.migrate.latest({ directory: './migrations' });
  });

  afterAll(async () => {
    await db.destroy();
  });

  afterEach(async () => {
    // Clean up users table between tests
    await db('users').del();
  });

  test('signup creates user and returns token', async () => {
    const res = await request(app)
      .post('/auth/signup')
      .send({ username: 'alice', email: 'alice@example.com', password: 'password123' })
      .expect(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('userId');
    // Verify password stored hashed
    const user = await db('users').where('id', res.body.userId).first();
    expect(user).toBeDefined();
    expect(user.password_hash).not.toBe('password123');
  });

  test('duplicate signup returns 409', async () => {
    // First signup
    await request(app)
      .post('/auth/signup')
      .send({ username: 'bob', email: 'bob@example.com', password: 'secret' })
      .expect(201);
    // Duplicate
    await request(app)
      .post('/auth/signup')
      .send({ username: 'bob', email: 'bob@example.com', password: 'secret' })
      .expect(409);
  });

  test('signin with correct credentials returns token', async () => {
    const password = 'myPass123';
    const passwordHash = await hashPassword(password);
    const [id] = await db('users').insert({ username: 'carol', email: 'carol@example.com', password_hash: passwordHash });
    const res = await request(app)
      .post('/auth/signin')
      .send({ usernameOrEmail: 'carol', password })
      .expect(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.userId).toBe(id);
  });

  test('signin with wrong password returns 401', async () => {
    const passwordHash = await hashPassword('correct');
    await db('users').insert({ username: 'dave', email: 'dave@example.com', password_hash: passwordHash });
    await request(app)
      .post('/auth signin')
      .send({ usernameOrEmail: 'dave', password: 'wrong' })
      .expect(401);
  });
});
