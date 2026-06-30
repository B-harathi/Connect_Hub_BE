const request = require('supertest');
const app = require('../../app');
const { buildUser, buildUsers } = require('../factories/userFactory');
const { generateToken } = require('../../middleware/auth');

describe('User Controller', () => {
  let authUser;
  let authToken;

  beforeEach(async () => {
    authUser = await buildUser();
    authToken = generateToken(authUser._id);
  });

  describe('GET /api/users/search', () => {
    it('should search users successfully', async () => {
      const user1 = await buildUser({ name: 'John Smith' });
      const user2 = await buildUser({ name: 'Jane Doe' });

      const res = await request(app)
        .get('/api/users/search')
        .query({ q: 'John' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should fail without search term', async () => {
      const res = await request(app)
        .get('/api/users/search')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail without auth token', async () => {
      const res = await request(app)
        .get('/api/users/search')
        .query({ q: 'test' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/users/:userId', () => {
    it('should get user by ID successfully', async () => {
      const targetUser = await buildUser();

      const res = await request(app)
        .get(`/api/users/${targetUser._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(targetUser.email);
    });

    it('should fail with invalid user ID', async () => {
      const res = await request(app)
        .get('/api/users/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/users/online/list', () => {
    it('should get online users successfully', async () => {
      await buildUser({ isOnline: true });
      await buildUser({ isOnline: true });

      const res = await request(app)
        .get('/api/users/online')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/users/stats', () => {
    it('should get user stats successfully', async () => {
      const res = await request(app)
        .get('/api/users/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('chatCount');
      expect(res.body.data).toHaveProperty('friendCount');
    });
  });

  describe('POST /api/users/friends/:userId', () => {
    it('should add friend successfully', async () => {
      const friendUser = await buildUser();

      const res = await request(app)
        .post(`/api/users/friends/${friendUser._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('successfully');
    });

    it('should fail to add self as friend', async () => {
      const res = await request(app)
        .post(`/api/users/friends/${authUser._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('yourself');
    });

    it('should fail if already friends', async () => {
      const friendUser = await buildUser();

      // Add friend first time
      await request(app)
        .post(`/api/users/friends/${friendUser._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Try to add again
      const res = await request(app)
        .post(`/api/users/friends/${friendUser._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already');
    });

    it('should fail with non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .post(`/api/users/friends/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/users/friends/:userId', () => {
    it('should remove friend successfully', async () => {
      const friendUser = await buildUser();

      // Add friend first
      await request(app)
        .post(`/api/users/friends/${friendUser._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Remove friend
      const res = await request(app)
        .delete(`/api/users/friends/${friendUser._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/users/friends/list', () => {
    it('should get friends list successfully', async () => {
      const friendUser = await buildUser();

      // Add friend first
      await request(app)
        .post(`/api/users/friends/${friendUser._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      const res = await request(app)
        .get('/api/users/friends/list')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/users/blocked/:userId', () => {
    it('should block user successfully', async () => {
      const targetUser = await buildUser();

      const res = await request(app)
        .post(`/api/users/blocked/${targetUser._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should fail to block self', async () => {
      const res = await request(app)
        .post(`/api/users/blocked/${authUser._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
    });

    it('should fail if already blocked', async () => {
      const targetUser = await buildUser();

      // Block first time
      await request(app)
        .post(`/api/users/blocked/${targetUser._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Try to block again
      const res = await request(app)
        .post(`/api/users/blocked/${targetUser._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already');
    });
  });

  describe('DELETE /api/users/blocked/:userId', () => {
    it('should unblock user successfully', async () => {
      const targetUser = await buildUser();

      // Block first
      await request(app)
        .post(`/api/users/blocked/${targetUser._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Unblock
      const res = await request(app)
        .delete(`/api/users/blocked/${targetUser._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/users/blocked/list', () => {
    it('should get blocked users list successfully', async () => {
      const res = await request(app)
        .get('/api/users/blocked/list')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
