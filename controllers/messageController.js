const Message = require('../models/Message');
const Chat = require('../models/Chat');
const { getSocketInstance } = require('../socket/socketHandler');

// Send message
const sendMessage = async (req, res) => {
  try {
    const { chatId, content, messageType = 'text', replyTo } = req.body;
    const senderId = req.user._id;

    // Verify chat exists and user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (!chat.isUserParticipant(senderId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this chat'
      });
    }

    // Create message data
    const messageData = {
      chat: chatId,
      sender: senderId,
      messageType,
      content: messageType === 'text' ? content : undefined,
      replyTo: replyTo || undefined
    };

    // Handle file upload for non-text messages
    if (messageType !== 'text' && req.file) {
      messageData.file = {
        url: req.file.path,
        publicId: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype
      };
    }

    // Create message
    const message = new Message(messageData);
    await message.save();

    // Populate message with sender info
    await message.populate('sender', 'name email avatar');
    if (replyTo) {
      await message.populate({
        path: 'replyTo',
        populate: {
          path: 'sender',
          select: 'name email avatar'
        }
      });
    }

    // Update chat's last message and activity
    chat.lastMessage = message._id;
    await chat.updateLastActivity();

    // Mark message as delivered to sender
    await message.markAsDelivered(senderId);

    // Emit message to all chat participants via Socket.io
    const io = getSocketInstance();
    if (io) {
      chat.participants.forEach(participantId => {
        if (participantId.toString() !== senderId.toString()) {
          io.to(`user_${participantId}`).emit('newMessage', {
            message,
            chat: {
              _id: chat._id,
              chatType: chat.chatType,
              chatName: chat.chatName
            }
          });
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: message
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get chat messages
const getChatMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user._id;

    // Verify chat exists and user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (!chat.isUserParticipant(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this chat'
      });
    }

    // Get messages
    const messages = await Message.getChatMessages(chatId, parseInt(page), parseInt(limit));

    // Reverse to show oldest first
    messages.reverse();

    res.json({
      success: true,
      message: 'Messages retrieved successfully',
      data: {
        messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: messages.length === parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get chat messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get messages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Mark message as read
const markMessageAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Verify user is participant of the chat
    const chat = await Chat.findById(message.chat);
    if (!chat || !chat.isUserParticipant(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Don't mark own messages as read
    if (message.sender.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot mark own message as read'
      });
    }

    await message.markAsRead(userId);

    // Emit read receipt via Socket.io
    const io = getSocketInstance();
    if (io) {
      io.to(`user_${message.sender}`).emit('messageRead', {
        messageId: message._id,
        readBy: userId,
        readAt: new Date()
      });
    }

    res.json({
      success: true,
      message: 'Message marked as read'
    });

  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark message as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Mark all messages as read
const markAllMessagesAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    // Verify chat exists and user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (!chat.isUserParticipant(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this chat'
      });
    }

    await Message.markAllAsRead(chatId, userId);

    // Emit read receipts via Socket.io
    const io = getSocketInstance();
    if (io) {
      chat.participants.forEach(participantId => {
        if (participantId.toString() !== userId.toString()) {
          io.to(`user_${participantId}`).emit('allMessagesRead', {
            chatId,
            readBy: userId,
            readAt: new Date()
          });
        }
      });
    }

    res.json({
      success: true,
      message: 'All messages marked as read'
    });

  } catch (error) {
    console.error('Mark all messages as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all messages as read',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Add reaction to message
const addReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Verify user is participant of the chat
    const chat = await Chat.findById(message.chat);
    if (!chat || !chat.isUserParticipant(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await message.addReaction(userId, emoji);
    await message.populate('reactions.user', 'name email avatar');

    // Emit reaction via Socket.io
    const io = getSocketInstance();
    if (io) {
      chat.participants.forEach(participantId => {
        io.to(`user_${participantId}`).emit('messageReaction', {
          messageId: message._id,
          reaction: {
            user: req.user,
            emoji,
            createdAt: new Date()
          }
        });
      });
    }

    res.json({
      success: true,
      message: 'Reaction added successfully',
      data: {
        reactions: message.reactions
      }
    });

  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add reaction',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Remove reaction from message
const removeReaction = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Verify user is participant of the chat
    const chat = await Chat.findById(message.chat);
    if (!chat || !chat.isUserParticipant(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await message.removeReaction(userId);
    await message.populate('reactions.user', 'name email avatar');

    // Emit reaction removal via Socket.io
    const io = getSocketInstance();
    if (io) {
      chat.participants.forEach(participantId => {
        io.to(`user_${participantId}`).emit('reactionRemoved', {
          messageId: message._id,
          userId
        });
      });
    }

    res.json({
      success: true,
      message: 'Reaction removed successfully',
      data: {
        reactions: message.reactions
      }
    });

  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove reaction',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Edit message
const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Only sender can edit message
    if (message.sender.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own messages'
      });
    }

    // Can only edit text messages
    if (message.messageType !== 'text') {
      return res.status(400).json({
        success: false,
        message: 'Can only edit text messages'
      });
    }

    await message.editMessage(content);
    await message.populate('sender', 'name email avatar');

    // Emit message edit via Socket.io
    const chat = await Chat.findById(message.chat);
    const io = getSocketInstance();
    if (io && chat) {
      chat.participants.forEach(participantId => {
        io.to(`user_${participantId}`).emit('messageEdited', {
          messageId: message._id,
          newContent: content,
          editedAt: new Date(),
          isEdited: true
        });
      });
    }

    res.json({
      success: true,
      message: 'Message edited successfully',
      data: message
    });

  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to edit message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete message
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Verify user can delete message (sender or chat admin)
    const chat = await Chat.findById(message.chat);
    const canDelete = message.sender.toString() === userId.toString() || 
                     (chat.chatType === 'group' && chat.isUserAdmin(userId));

    if (!canDelete) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages or be an admin'
      });
    }

    await message.deleteMessage(userId);

    // Emit message deletion via Socket.io
    const io = getSocketInstance();
    if (io && chat) {
      chat.participants.forEach(participantId => {
        io.to(`user_${participantId}`).emit('messageDeleted', {
          messageId: message._id,
          deletedBy: userId,
          deletedAt: new Date()
        });
      });
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Search messages in chat
const searchMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { q: searchTerm, limit = 20 } = req.query;
    const userId = req.user._id;

    if (!searchTerm || searchTerm.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }

    // Verify chat exists and user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (!chat.isUserParticipant(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this chat'
      });
    }

    const messages = await Message.searchMessages(chatId, searchTerm.trim(), parseInt(limit));

    res.json({
      success: true,
      message: 'Messages found',
      data: {
        messages,
        searchTerm: searchTerm.trim(),
        count: messages.length
      }
    });

  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search messages',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get message by ID
const getMessageById = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId)
      .populate('sender', 'name email avatar')
      .populate('chat', 'participants chatType')
      .populate('replyTo', 'content messageType sender')
      .populate({
        path: 'replyTo',
        populate: {
          path: 'sender',
          select: 'name email avatar'
        }
      })
      .populate('reactions.user', 'name email avatar');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Verify user is participant of the chat
    if (!message.chat.participants.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: message
    });

  } catch (error) {
    console.error('Get message by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get unread message count for user
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    // Get all user's chats
    const userChats = await Chat.find({
      participants: userId,
      isActive: true
    }).select('_id');

    let totalUnreadCount = 0;
    const chatUnreadCounts = {};

    // Get unread count for each chat
    for (const chat of userChats) {
      const unreadCount = await Message.getUnreadCount(chat._id, userId);
      chatUnreadCounts[chat._id] = unreadCount;
      totalUnreadCount += unreadCount;
    }

    res.json({
      success: true,
      message: 'Unread counts retrieved successfully',
      data: {
        totalUnreadCount,
        chatUnreadCounts
      }
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Upload file and send as message
const uploadAndSendFile = async (req, res) => {
  try {
    const { chatId } = req.body;
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Verify chat exists and user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (!chat.isUserParticipant(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this chat'
      });
    }

    // Determine message type based on file type
    let messageType = 'file';
    if (req.file.mimetype.startsWith('image/')) {
      messageType = 'image';
    }

    // Create message with file
    const message = new Message({
      chat: chatId,
      sender: userId,
      messageType,
      file: {
        url: req.file.path,
        publicId: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype
      }
    });

    await message.save();
    await message.populate('sender', 'name email avatar');

    // Update chat's last message and activity
    chat.lastMessage = message._id;
    await chat.updateLastActivity();

    // Mark message as delivered to sender
    await message.markAsDelivered(userId);

    // Emit message to all chat participants via Socket.io
    const io = getSocketInstance();
    if (io) {
      chat.participants.forEach(participantId => {
        if (participantId.toString() !== userId.toString()) {
          io.to(`user_${participantId}`).emit('newMessage', {
            message,
            chat: {
              _id: chat._id,
              chatType: chat.chatType,
              chatName: chat.chatName
            }
          });
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'File sent successfully',
      data: message
    });

  } catch (error) {
    console.error('Upload and send file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send file',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  sendMessage,
  getChatMessages,
  markMessageAsRead,
  markAllMessagesAsRead,
  addReaction,
  removeReaction,
  editMessage,
  deleteMessage,
  searchMessages,
  getMessageById,
  getUnreadCount,
  uploadAndSendFile
};