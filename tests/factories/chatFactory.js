const Chat = require('../../models/Chat');

const buildChat = async (creator, overrides = {}) => {
  // Extract creator's _id for createdBy
  const creatorId = creator._id || creator;

  // Get participants - from overrides or default to [creator]
  const participants = overrides.participants ? overrides.participants : [creator];

  // Map participants to their _id values
  const participantIds = participants.map(p => p._id || p);

  // Get admins - from overrides or default to [creatorId]
  const adminIds = overrides.admins ? overrides.admins : [creatorId];

  const chatData = {
    ...overrides, // Spread first so explicit fields override any in overrides
    chatType: overrides.chatType || 'private',
    chatName: overrides.chatName || overrides.name || 'Test Chat',
    description: overrides.description || 'Test chat description',
    participants: participantIds,
    createdBy: creatorId,
    admins: adminIds,
    lastActivity: new Date()
  };

  const chat = new Chat(chatData);
  await chat.save();
  return chat;
};

const buildGroupChat = async (creator, participants = [], overrides = {}) => {
  const allParticipants = [creator, ...participants];
  return buildChat(creator, {
    ...overrides,
    chatType: 'group',
    participants: allParticipants
  });
};

const buildPrivateChat = async (user1, user2, overrides = {}) => {
  return buildChat(user1, {
    ...overrides,
    chatType: 'private',
    participants: [user1, user2],
    admins: [user1._id || user1] // Creator is admin for private chats too
  });
};

module.exports = {
  buildChat,
  buildGroupChat,
  buildPrivateChat
};
