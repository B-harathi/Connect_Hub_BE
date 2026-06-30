const express = require('express');
const router = express.Router();

// Import controllers and middleware
const {
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
} = require('../controllers/messageController');

const { authenticate, requireChatParticipant } = require('../middleware/auth');
const { messageLimiter, uploadLimiter, searchLimiter } = require('../middleware/rateLimiter');
const {
  validateMessage,
  validateObjectId,
  validatePagination,
  validateSearch,
  validateReaction
} = require('../middleware/validation');
const { 
  uploadMessageImage, 
  handleUploadError, 
  processFileInfo 
} = require('../middleware/upload');

// All routes require authentication
router.use(authenticate);

// Get unread message count
router.get('/unread-count', getUnreadCount);

// Send message
router.post('/',
  messageLimiter,
  validateMessage,
  sendMessage
);

// Upload file and send as message
router.post('/upload',
  uploadLimiter,
  uploadMessageImage.single('file'),
  handleUploadError,
  processFileInfo,
  uploadAndSendFile
);

// Get message by ID
router.get('/:messageId', validateObjectId('messageId'), getMessageById);

// Edit message
router.put('/:messageId',
  validateObjectId('messageId'),
  editMessage
);

// Delete message
router.delete('/:messageId', validateObjectId('messageId'), deleteMessage);

// Message reactions
router.post('/:messageId/reactions',
  validateObjectId('messageId'),
  validateReaction,
  addReaction
);

router.delete('/:messageId/reactions', validateObjectId('messageId'), removeReaction);

// Mark message as read
router.post('/:messageId/read', validateObjectId('messageId'), markMessageAsRead);

// Chat-specific message routes
router.get('/chat/:chatId',
  validateObjectId('chatId'),
  validatePagination,
  requireChatParticipant,
  getChatMessages
);

router.post('/chat/:chatId/read-all',
  validateObjectId('chatId'),
  requireChatParticipant,
  markAllMessagesAsRead
);

router.get('/chat/:chatId/search',
  validateObjectId('chatId'),
  searchLimiter,
  validateSearch,
  requireChatParticipant,
  searchMessages
);

module.exports = router;