const Chat = require('../models/Chat');
const Message = require('../models/Message');
const User = require('../models/User');

// Get all user chats
const getUserChats = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20 } = req.query;

    const chats = await Chat.findUserChats(userId);

    // Get unread message count for each chat
    const chatsWithUnreadCount = await Promise.all(
      chats.map(async (chat) => {
        const unreadCount = await Message.getUnreadCount(chat._id, userId);
        return {
          ...chat.toObject(),
          unreadCount
        };
      })
    );

    res.json({
      success: true,
      message: 'Chats retrieved successfully',
      data: chatsWithUnreadCount
    });

  } catch (error) {
    console.error('Get user chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chats',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get or create private chat
const getOrCreatePrivateChat = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (userId === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create chat with yourself'
      });
    }

    // Check if target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if private chat already exists
    let chat = await Chat.findPrivateChat(currentUserId, userId);

    if (!chat) {
      // Create new private chat
      chat = await Chat.createPrivateChat(currentUserId, userId);
      await chat.populate('participants', 'name email avatar isOnline lastActive');
    }

    res.json({
      success: true,
      message: chat.isNew ? 'Private chat created successfully' : 'Private chat found',
      data: chat
    });

  } catch (error) {
    console.error('Get or create private chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get or create private chat',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Create group chat
const createGroupChat = async (req, res) => {
  try {
    const { chatName, description, participants, chatImage } = req.body;
    const createdBy = req.user._id;

    // Validate participants
    if (!participants || participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one participant is required'
      });
    }

    // Add creator to participants if not already included
    const participantIds = [...new Set([...participants, createdBy.toString()])];

    // Verify all participants exist
    const existingUsers = await User.find({
      _id: { $in: participantIds }
    }).select('_id');

    if (existingUsers.length !== participantIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more participants not found'
      });
    }

    // Create group chat
    const chat = await Chat.createGroupChat({
      name: chatName,
      description,
      participants: participantIds,
      createdBy,
      chatImage
    });

    await chat.populate('participants', 'name email avatar isOnline lastActive');
    await chat.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Group chat created successfully',
      data: chat
    });

  } catch (error) {
    console.error('Create group chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create group chat',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get chat by ID
const getChatById = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId)
      .populate('participants', 'name email avatar isOnline lastActive')
      .populate('lastMessage')
      .populate('createdBy', 'name email')
      .populate('admins', 'name email');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is participant
    if (!chat.isUserParticipant(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this chat.'
      });
    }

    // Get unread message count
    const unreadCount = await Message.getUnreadCount(chatId, userId);

    const chatData = {
      ...chat.toObject(),
      unreadCount
    };

    res.json({
      success: true,
      data: chatData
    });

  } catch (error) {
    console.error('Get chat by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update chat details
const updateChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { chatName, description, chatImage } = req.body;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is admin (for group chats) or participant (for private chats)
    if (chat.chatType === 'group' && !chat.isUserAdmin(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can update group chat details'
      });
    }

    if (chat.chatType === 'private') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update private chat details'
      });
    }

    // Update chat details
    const updateData = {};
    if (chatName) updateData.chatName = chatName;
    if (description !== undefined) updateData.description = description;
    if (chatImage !== undefined) updateData.chatImage = chatImage;

    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      updateData,
      { new: true, runValidators: true }
    ).populate('participants', 'name email avatar isOnline lastActive')
     .populate('createdBy', 'name email')
     .populate('admins', 'name email');

    res.json({
      success: true,
      message: 'Chat updated successfully',
      data: updatedChat
    });

  } catch (error) {
    console.error('Update chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update chat',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Add participant to group chat
const addParticipant = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { userId: newParticipantId } = req.body;
    const currentUserId = req.user._id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (chat.chatType !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'Can only add participants to group chats'
      });
    }

    // Check if current user is admin
    if (!chat.isUserAdmin(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can add participants'
      });
    }

    // Check if new participant exists
    const newParticipant = await User.findById(newParticipantId);
    if (!newParticipant) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already a participant
    if (chat.isUserParticipant(newParticipantId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already a participant'
      });
    }

    // Add participant
    await chat.addParticipant(newParticipantId);

    // Populate the updated chat
    await chat.populate('participants', 'name email avatar isOnline lastActive');

    res.json({
      success: true,
      message: 'Participant added successfully',
      data: chat
    });

  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add participant',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Remove participant from group chat
const removeParticipant = async (req, res) => {
  try {
    const { chatId, userId: participantId } = req.params;
    const currentUserId = req.user._id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (chat.chatType !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'Can only remove participants from group chats'
      });
    }

    // Check permissions
    const isAdmin = chat.isUserAdmin(currentUserId);
    const isSelf = currentUserId.toString() === participantId;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'You can only remove yourself or be an admin to remove others'
      });
    }

    // Cannot remove chat creator
    if (participantId === chat.createdBy.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove chat creator'
      });
    }

    // Remove participant
    await chat.removeParticipant(participantId);

    // Populate the updated chat
    await chat.populate('participants', 'name email avatar isOnline lastActive');

    res.json({
      success: true,
      message: 'Participant removed successfully',
      data: chat
    });

  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove participant',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Leave group chat
const leaveChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (chat.chatType !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'Cannot leave private chats'
      });
    }

    // Check if user is participant
    if (!chat.isUserParticipant(userId)) {
      return res.status(400).json({
        success: false,
        message: 'You are not a member of this chat'
      });
    }

    // Cannot leave if user is the creator and there are other participants
    if (userId.toString() === chat.createdBy.toString() && chat.participants.length > 1) {
      return res.status(400).json({
        success: false,
        message: 'Chat creator cannot leave. Transfer ownership or delete the chat.'
      });
    }

    // Remove user from chat
    await chat.removeParticipant(userId);

    // If no participants left, deactivate the chat
    if (chat.participants.length === 0) {
      chat.isActive = false;
      await chat.save();
    }

    res.json({
      success: true,
      message: 'Left chat successfully'
    });

  } catch (error) {
    console.error('Leave chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave chat',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete chat
const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check permissions
    if (chat.chatType === 'group' && !chat.isUserAdmin(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete group chats'
      });
    }

    if (chat.chatType === 'private' && !chat.isUserParticipant(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete chats you are a member of'
      });
    }

    // Soft delete the chat
    chat.isActive = false;
    await chat.save();

    res.json({
      success: true,
      message: 'Chat deleted successfully'
    });

  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete chat',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Make user admin
const makeAdmin = async (req, res) => {
  try {
    const { chatId, userId: targetUserId } = req.params;
    const currentUserId = req.user._id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (chat.chatType !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'Can only make admins in group chats'
      });
    }

    // Check if current user is admin
    if (!chat.isUserAdmin(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can promote other users'
      });
    }

    // Check if target user is participant
    if (!chat.isUserParticipant(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'User must be a participant to become admin'
      });
    }

    // Add as admin
    await chat.addAdmin(targetUserId);

    await chat.populate('admins', 'name email avatar');

    res.json({
      success: true,
      message: 'User promoted to admin successfully',
      data: {
        admins: chat.admins
      }
    });

  } catch (error) {
    console.error('Make admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to make user admin',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Remove admin
const removeAdmin = async (req, res) => {
  try {
    const { chatId, userId: targetUserId } = req.params;
    const currentUserId = req.user._id;

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (chat.chatType !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'Can only remove admins from group chats'
      });
    }

    // Check if current user is admin
    if (!chat.isUserAdmin(currentUserId)) {
      return res.status(403).json({
        success: false,
        message: 'Only admins can demote other admins'
      });
    }

    // Remove admin
    await chat.removeAdmin(targetUserId);

    await chat.populate('admins', 'name email avatar');

    res.json({
      success: true,
      message: 'Admin removed successfully',
      data: {
        admins: chat.admins
      }
    });

  } catch (error) {
    console.error('Remove admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove admin',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getUserChats,
  getOrCreatePrivateChat,
  createGroupChat,
  getChatById,
  updateChat,
  addParticipant,
  removeParticipant,
  leaveChat,
  deleteChat,
  makeAdmin,
  removeAdmin
};