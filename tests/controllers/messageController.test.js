const request = require('supertest');
const app = require('../../app');
const { buildUser } = require('../factories/userFactory');
const { buildPrivateChat } = require('../factories/chatFactory');
const { buildMessage, buildTextMessage } = require('../factories/messageFactory');
const { generateToken } = require('../../middleware/auth');

describe('Message Controller', () => {
  let authUser;
  let authToken;
  let chat;
  let otherUser;

  beforeEach(async () => {
    authUser = await buildUser();
    otherUser = await buildUser();
    authToken = generateToken(authUser._id);
    chat = await buildPrivateChat(authUser, otherUser);
  });

  describe('POST /api/messages', () => {
    it('should send message successfully', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chatId: chat._id.toString(),
          content: 'Hello, World!'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('Hello, World!');
    });

    it('should fail for non-existent chat', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          chatId: fakeId,
          content: 'Hello!'
        });

      expect(res.status).toBe(404);
    });

    it('should fail when not a participant', async () => {
      const thirdUser = await buildUser();
      const token = generateToken(thirdUser._id);

      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({
          chatId: chat._id.toString(),
          content: 'Hello!'
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/messages/chat/:chatId', () => {
    it('should get chat messages successfully', async () => {
      // Create some messages first
      await buildTextMessage(authUser, chat, 'Message 1');
      await buildTextMessage(otherUser, chat, 'Message 2');

      const res = await request(app)
        .get(`/api/messages/chat/${chat._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.messages)).toBe(true);
      expect(res.body.data.messages.length).toBe(2);
    });

    it('should fail for non-existent chat', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .get(`/api/messages/chat/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });

    it('should fail when not a participant', async () => {
      const thirdUser = await buildUser();
      const token = generateToken(thirdUser._id);

      const res = await request(app)
        .get(`/api/messages/chat/${chat._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/messages/:messageId/read', () => {
    it('should mark message as read successfully', async () => {
      const message = await buildTextMessage(otherUser, chat, 'Read me');

      const res = await request(app)
        .post(`/api/messages/${message._id}/read`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should fail to mark own message as read', async () => {
      const message = await buildTextMessage(authUser, chat, 'My message');

      const res = await request(app)
        .post(`/api/messages/${message._id}/read`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('own message');
    });
  });

  describe('POST /api/messages/:messageId/reactions', () => {
    it('should add reaction successfully', async () => {
      const message = await buildTextMessage(otherUser, chat, 'React to me');

      const res = await request(app)
        .post(`/api/messages/${message._id}/reactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ emoji: '👍' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should fail for non-existent message', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .post(`/api/messages/${fakeId}/reactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ emoji: '👍' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/messages/:messageId/reactions', () => {
    it('should remove reaction successfully', async () => {
      const message = await buildTextMessage(otherUser, chat, 'Remove reaction');

      // Add reaction first
      await request(app)
        .post(`/api/messages/${message._id}/reactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ emoji: '👍' });

      // Remove reaction
      const res = await request(app)
        .delete(`/api/messages/${message._id}/reactions`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PUT /api/messages/:messageId', () => {
    it('should edit message successfully', async () => {
      const message = await buildTextMessage(authUser, chat, 'Original content');

      const res = await request(app)
        .put(`/api/messages/${message._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Updated content' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('Updated content');
    });

    it('should fail to edit other user message', async () => {
      const message = await buildTextMessage(otherUser, chat, 'Other user message');

      const res = await request(app)
        .put(`/api/messages/${message._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ content: 'Trying to edit' });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('own messages');
    });
  });

  describe('DELETE /api/messages/:messageId', () => {
    it('should delete own message successfully', async () => {
      const message = await buildTextMessage(authUser, chat, 'Delete me');

      const res = await request(app)
        .delete(`/api/messages/${message._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should fail to delete non-existent message', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      const res = await request(app)
        .delete(`/api/messages/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/messages/chat/:chatId/search', () => {
    it('should search messages successfully', async () => {
      await buildTextMessage(authUser, chat, 'Hello there');
      await buildTextMessage(otherUser, chat, 'How are you?');
      await buildTextMessage(authUser, chat, 'Hello again');

      const res = await request(app)
        .get(`/api/messages/chat/${chat._id}/search`)
        .query({ q: 'Hello' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.messages.length).toBe(2);
    });

    it('should fail without search term', async () => {
      const res = await request(app)
        .get(`/api/messages/chat/${chat._id}/search`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/messages/unread-count', () => {
    it('should get unread count successfully', async () => {
      const res = await request(app)
        .get('/api/messages/unread-count')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalUnreadCount');
      expect(res.body.data).toHaveProperty('chatUnreadCounts');
    });
  });

  describe('POST /api/messages/chat/:chatId/read-all', () => {
    it('should mark all messages as read successfully', async () => {
      const res = await request(app)
        .post(`/api/messages/chat/${chat._id}/read-all`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
