const Message = require('../../models/Message');

const buildMessage = async (sender, chat, overrides = {}) => {
  const messageData = {
    chat: chat._id,
    sender: sender._id,
    content: overrides.content || 'Test message content',
    messageType: overrides.messageType || 'text',
    file: overrides.file || null,
    reactions: overrides.reactions || [],
    readBy: overrides.readBy || [],
    isEdited: overrides.isEdited || false,
    createdAt: overrides.createdAt || new Date(),
    ...overrides
  };

  const message = new Message(messageData);
  await message.save();
  return message;
};

const buildTextMessage = async (sender, chat, content) => {
  return buildMessage(sender, chat, { content, messageType: 'text' });
};

const buildImageMessage = async (sender, chat, fileData) => {
  return buildMessage(sender, chat, {
    messageType: 'image',
    file: fileData || {
      url: 'https://example.com/image.jpg',
      originalName: 'image.jpg',
      mimeType: 'image/jpeg',
      size: 1024
    }
  });
};

const buildMessages = async (sender, chat, count = 5) => {
  const messages = [];
  for (let i = 0; i < count; i++) {
    const message = await buildMessage(sender, chat, {
      content: `Test message ${i}`
    });
    messages.push(message);
  }
  return messages;
};

module.exports = {
  buildMessage,
  buildTextMessage,
  buildImageMessage,
  buildMessages
};
