const request = require('supertest');
const app = require('../../app');
const { buildUser, buildUsers } = require('../factories/userFactory');
const { buildChat, buildGroupChat, buildPrivateChat } = require('../factories/chatFactory');
const { generateToken } = require('../../middleware/auth');

describe('Chat Controller', () => {
  let authUser;
  let authToken;

  beforeEach(async () => {
    authUser = await buildUser();
    authToken = generateToken(authUser._id);
  });

  describe('GET /api/chats', () => {
    it('should get user chats successfully', async () => {
      const res = await request(app)
        .get('/api/chats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/chats/private/:userId', () => {
    it('should create private chat successfully', async () => {
      const otherUser = await buildUser();

      const res = await request(app)
        .post(`/api/chats/private/${otherUser._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.chatType).toBe('private');
    });

    it('should return existing private chat', async () => {
      const otherUser = await buildUser();

      // Create first time
      await request(app)
        .post(`/api/chats/private/${otherUser._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Request again - should return existing
      const res = await request(app)
        .post(`/api/chats/private/${otherUser._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should fail with self', async () => {
      const res = await request(app)
        .post(`/api/chats/private/${authUser._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('yourself');
    });

    it('should fail with non-existent user', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .post(`/api/chats/private/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/chats/group', () => {
    it('should create group chat successfully', async () => {
      const participants = await buildUsers(3);

      const res = await request(app)
        .post('/api/chats/group')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chatType: 'group',
          chatName: 'Test Group',
          description: 'A test group chat',
          participants: participants.map(p => p._id)
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.chatType).toBe('group');
      expect(res.body.data.chatName).toBe('Test Group');
    });

    it('should fail with no participants', async () => {
      const res = await request(app)
        .post('/api/chats/group')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chatType: 'group',
          chatName: 'Test Group'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      // Validation error returns message in errors array
      expect(res.body.errors[0].message).toContain('participant');
    });

    it('should fail with invalid participant IDs', async () => {
      const res = await request(app)
        .post('/api/chats/group')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chatName: 'Test Group',
          participants: ['507f1f77bcf86cd799439011']
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/chats/:chatId', () => {
    it('should get chat by ID successfully', async () => {
      const chat = await buildPrivateChat(authUser, await buildUser());

      const res = await request(app)
        .get(`/api/chats/${chat._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(chat._id.toString());
    });

    it('should fail for non-existent chat', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .get(`/api/chats/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/chats/:chatId', () => {
    it('should update group chat successfully', async () => {
      const chat = await buildGroupChat(authUser, []);

      const res = await request(app)
        .put(`/api/chats/${chat._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chatName: 'Updated Group Name',
          description: 'Updated description'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.chatName).toBe('Updated Group Name');
    });

    it('should fail to update private chat', async () => {
      const otherUser = await buildUser();
      const chat = await buildPrivateChat(authUser, otherUser);

      const res = await request(app)
        .put(`/api/chats/${chat._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chatName: 'Updated Name'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Cannot update');
    });

    it('should fail for non-admin user on group chat', async () => {
      const otherUser = await buildUser();
      const chat = await buildGroupChat(otherUser, []);

      const res = await request(app)
        .put(`/api/chats/${chat._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chatName: 'Updated Name'
        });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/chats/:chatId', () => {
    it('should delete chat successfully', async () => {
      const chat = await buildPrivateChat(authUser, await buildUser());

      const res = await request(app)
        .delete(`/api/chats/${chat._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/chats/:chatId/participants', () => {
    it('should add participant successfully', async () => {
      const newUser = await buildUser();
      const chat = await buildGroupChat(authUser, []);

      const res = await request(app)
        .post(`/api/chats/${chat._id}/participants`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: newUser._id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should fail to add participant to private chat', async () => {
      const newUser = await buildUser();
      const otherUser = await buildUser();
      const chat = await buildPrivateChat(authUser, otherUser);

      const res = await request(app)
        .post(`/api/chats/${chat._id}/participants`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ userId: newUser._id });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('group chats');
    });
  });

  describe('DELETE /api/chats/:chatId/participants/:userId', () => {
    it('should remove participant successfully', async () => {
      const participant = await buildUser();
      const chat = await buildGroupChat(authUser, [participant]);

      const res = await request(app)
        .delete(`/api/chats/${chat._id}/participants/${participant._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should fail to remove chat creator', async () => {
      const chat = await buildGroupChat(authUser, []);

      const res = await request(app)
        .delete(`/api/chats/${chat._id}/participants/${authUser._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('creator');
    });
  });

  describe('POST /api/chats/:chatId/leave', () => {
    it('should leave chat successfully', async () => {
      const participant = await buildUser();
      const chat = await buildGroupChat(participant, []);

      const token = generateToken(participant._id);
      const res = await request(app)
        .post(`/api/chats/${chat._id}/leave`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should fail to leave private chat', async () => {
      const chat = await buildPrivateChat(authUser, await buildUser());

      const res = await request(app)
        .post(`/api/chats/${chat._id}/leave`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('private');
    });
  });

  describe('POST /api/chats/:chatId/admins/:userId', () => {
    it('should make user admin successfully', async () => {
      const participant = await buildUser();
      const chat = await buildGroupChat(authUser, [participant]);

      const res = await request(app)
        .post(`/api/chats/${chat._id}/admins/${participant._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should fail to make admin on private chat', async () => {
      const chat = await buildPrivateChat(authUser, await buildUser());

      const res = await request(app)
        .post(`/api/chats/${chat._id}/admins/${authUser._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('group chats');
    });
  });

  describe('DELETE /api/chats/:chatId/admins/:userId', () => {
    it('should remove admin successfully', async () => {
      const participant = await buildUser();
      const chat = await buildGroupChat(authUser, [participant]);

      // Make participant an admin first
      await request(app)
        .post(`/api/chats/${chat._id}/admins/${participant._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Now remove them as admin
      const res = await request(app)
        .delete(`/api/chats/${chat._id}/admins/${participant._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
