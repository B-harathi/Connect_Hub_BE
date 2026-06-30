const User = require('../models/User');
const Chat = require('../models/Chat');

// Search users
const searchUsers = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const currentUserId = req.user._id;

    if (!searchTerm || searchTerm.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search term is required'
      });
    }

    const users = await User.searchUsers(searchTerm.trim(), currentUserId);

    res.json({
      success: true,
      message: 'Users found',
      data: users
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .select('name email avatar bio isOnline lastActive createdAt');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get online users
const getOnlineUsers = async (req, res) => {
  try {
    const users = await User.getOnlineUsers();

    res.json({
      success: true,
      message: 'Online users retrieved',
      data: users
    });

  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get online users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Add friend
const addFriend = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (userId === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add yourself as friend'
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

    // Check if already friends
    const currentUser = await User.findById(currentUserId);
    const isAlreadyFriend = currentUser.friends.some(
      friend => friend.user.toString() === userId
    );

    if (isAlreadyFriend) {
      return res.status(400).json({
        success: false,
        message: 'User is already in your friends list'
      });
    }

    // Add friend to current user
    currentUser.friends.push({
      user: userId,
      addedAt: new Date()
    });
    await currentUser.save();

    // Add current user to target user's friends list
    targetUser.friends.push({
      user: currentUserId,
      addedAt: new Date()
    });
    await targetUser.save();

    res.json({
      success: true,
      message: 'Friend added successfully'
    });

  } catch (error) {
    console.error('Add friend error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add friend',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Remove friend
const removeFriend = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    // Remove friend from current user
    const currentUser = await User.findById(currentUserId);
    currentUser.friends = currentUser.friends.filter(
      friend => friend.user.toString() !== userId
    );
    await currentUser.save();

    // Remove current user from target user's friends list
    const targetUser = await User.findById(userId);
    if (targetUser) {
      targetUser.friends = targetUser.friends.filter(
        friend => friend.user.toString() !== currentUserId.toString()
      );
      await targetUser.save();
    }

    res.json({
      success: true,
      message: 'Friend removed successfully'
    });

  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove friend',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user's friends
const getFriends = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const user = await User.findById(currentUserId)
      .populate('friends.user', 'name email avatar isOnline lastActive')
      .select('friends');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Friends retrieved successfully',
      data: user.friends
    });

  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get friends',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Block user
const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    if (userId === currentUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot block yourself'
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

    const currentUser = await User.findById(currentUserId);

    // Check if already blocked
    if (currentUser.blockedUsers.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already blocked'
      });
    }

    // Add to blocked users
    currentUser.blockedUsers.push(userId);

    // Remove from friends if they were friends
    currentUser.friends = currentUser.friends.filter(
      friend => friend.user.toString() !== userId
    );

    await currentUser.save();

    // Remove current user from target user's friends list
    targetUser.friends = targetUser.friends.filter(
      friend => friend.user.toString() !== currentUserId.toString()
    );
    await targetUser.save();

    res.json({
      success: true,
      message: 'User blocked successfully'
    });

  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to block user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Unblock user
const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const currentUser = await User.findById(currentUserId);

    // Remove from blocked users
    currentUser.blockedUsers = currentUser.blockedUsers.filter(
      blockedUserId => blockedUserId.toString() !== userId
    );

    await currentUser.save();

    res.json({
      success: true,
      message: 'User unblocked successfully'
    });

  } catch (error) {
    console.error('Unblock user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unblock user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get blocked users
const getBlockedUsers = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const user = await User.findById(currentUserId)
      .populate('blockedUsers', 'name email avatar')
      .select('blockedUsers');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Blocked users retrieved successfully',
      data: user.blockedUsers
    });

  } catch (error) {
    console.error('Get blocked users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get blocked users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update avatar
const updateAvatar = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded'
      });
    }

    // Update user avatar
    const user = await User.findByIdAndUpdate(
      userId,
      { avatar: req.file.path },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Avatar updated successfully',
      data: {
        avatar: user.avatar
      }
    });

  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update avatar',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get user statistics
const getUserStats = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Get user's chat count
    const chatCount = await Chat.countDocuments({
      participants: currentUserId,
      isActive: true
    });

    // Get friend count
    const user = await User.findById(currentUserId).select('friends');
    const friendCount = user ? user.friends.length : 0;

    const stats = {
      chatCount,
      friendCount,
      joinedAt: user?.createdAt
    };

    res.json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  searchUsers,
  getUserById,
  getOnlineUsers,
  addFriend,
  removeFriend,
  getFriends,
  blockUser,
  unblockUser,
  getBlockedUsers,
  updateAvatar,
  getUserStats
};