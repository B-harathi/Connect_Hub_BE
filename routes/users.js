const express = require('express');
const router = express.Router();

// Import controllers and middleware
const {
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
} = require('../controllers/userController');

const { authenticate } = require('../middleware/auth');
const { searchLimiter } = require('../middleware/rateLimiter');
const { validateSearch, validateObjectId } = require('../middleware/validation');
const { uploadAvatar, handleUploadError, validateUploadedFile } = require('../middleware/upload');

// All routes require authentication
router.use(authenticate);

// Search users
router.get('/search', searchLimiter, validateSearch, searchUsers);

// Get online users
router.get('/online', getOnlineUsers);

// User profile routes
router.get('/stats', getUserStats);
router.get('/:userId', validateObjectId('userId'), getUserById);

// Avatar upload
router.post('/avatar',
  uploadAvatar.single('avatar'),
  handleUploadError,
  validateUploadedFile,
  updateAvatar
);

// Friend management
router.get('/friends/list', getFriends);
router.post('/friends/:userId', validateObjectId('userId'), addFriend);
router.delete('/friends/:userId', validateObjectId('userId'), removeFriend);

// Block management
router.get('/blocked/list', getBlockedUsers);
router.post('/blocked/:userId', validateObjectId('userId'), blockUser);
router.delete('/blocked/:userId', validateObjectId('userId'), unblockUser);

module.exports = router;