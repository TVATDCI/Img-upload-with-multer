import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import { createAuthCookie, cleanupDb, seedAdminUser } from '../utils/testHelpers.js';
import { setupIntegrationApp, teardownIntegrationApp } from '../utils/testApp.js';

describe('auth routes', () => {
  let app;

  beforeAll(async () => {
    app = await setupIntegrationApp();
  });

  beforeEach(async () => {
    await cleanupDb();
  });

  afterAll(async () => {
    await teardownIntegrationApp();
  });

  test('POST /auth/login returns a success envelope and auth cookie', async () => {
    await seedAdminUser();

    const response = await request(app).post('/auth/login').send({
      email: 'admin@example.com',
      password: 'Password123!',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('admin@example.com');
    expect(response.body.data.user.password).toBeUndefined();
    expect(response.headers['set-cookie'][0]).toContain('jwt=');
  });

  test('POST /auth/logout clears the jwt cookie', async () => {
    const response = await request(app).post('/auth/logout').send();

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Logged out successfully',
      data: null,
    });
    expect(response.headers['set-cookie'][0]).toContain('jwt=loggedout');
  });

  test('GET /auth/getMe requires authentication', async () => {
    const response = await request(app).get('/auth/getMe');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      error: 'You are not logged in! Please login to get access.',
    });
  });

  test('GET /auth/getMe returns the authenticated admin', async () => {
    const user = await seedAdminUser();

    const response = await request(app)
      .get('/auth/getMe')
      .set('Cookie', createAuthCookie(user));

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('admin@example.com');
    expect(response.body.error).toBeUndefined();
  });
});
