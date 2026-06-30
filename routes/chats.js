const express = require('express');
const router = express.Router();

// Import controllers and middleware
const {
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
} = require('../controllers/chatController');

const { authenticate, requireChatAdmin, requireChatParticipant } = require('../middleware/auth');
const { chatCreationLimiter } = require('../middleware/rateLimiter');
const { validateChatCreation, validateObjectId, validatePagination } = require('../middleware/validation');
const { uploadGroupImage, handleUploadError } = require('../middleware/upload');

// All routes require authentication
router.use(authenticate);

// Get user's chats
router.get('/', validatePagination, getUserChats);

// Create group chat
router.post('/group',
  chatCreationLimiter,
  uploadGroupImage.single('chatImage'),
  handleUploadError,
  validateChatCreation,
  createGroupChat
);

// Get or create private chat
router.post('/private/:userId', validateObjectId('userId'), getOrCreatePrivateChat);

// Chat management routes
router.get('/:chatId', validateObjectId('chatId'), getChatById);
router.put('/:chatId', validateObjectId('chatId'), requireChatAdmin, updateChat);
router.delete('/:chatId', validateObjectId('chatId'), deleteChat);

// Leave chat
router.post('/:chatId/leave', validateObjectId('chatId'), requireChatParticipant, leaveChat);

// Participant management
router.post('/:chatId/participants',
  validateObjectId('chatId'),
  requireChatAdmin,
  addParticipant
);

router.delete('/:chatId/participants/:userId',
  validateObjectId('chatId'),
  validateObjectId('userId'),
  removeParticipant
);

// Admin management
router.post('/:chatId/admins/:userId',
  validateObjectId('chatId'),
  validateObjectId('userId'),
  requireChatAdmin,
  makeAdmin
);

router.delete('/:chatId/admins/:userId',
  validateObjectId('chatId'),
  validateObjectId('userId'),
  requireChatAdmin,
  removeAdmin
);

module.exports = router;