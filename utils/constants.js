// Message types
const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  VOICE: 'voice',
  SYSTEM: 'system'
};

// Chat types
const CHAT_TYPES = {
  PRIVATE: 'private',
  GROUP: 'group'
};

// User status
const USER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  AWAY: 'away',
  BUSY: 'busy'
};

// Socket events
const SOCKET_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  
  // User events
  USER_ONLINE: 'userOnline',
  USER_OFFLINE: 'userOffline',
  USER_TYPING: 'userTyping',
  USER_STOPPED_TYPING: 'userStoppedTyping',
  USER_STATUS_UPDATE: 'userStatusUpdate',
  
  // Message events
  NEW_MESSAGE: 'newMessage',
  MESSAGE_SENT: 'messageSent',
  MESSAGE_DELIVERED: 'messageDelivered',
  MESSAGE_READ: 'messageRead',
  MESSAGE_EDITED: 'messageEdited',
  MESSAGE_DELETED: 'messageDeleted',
  
  // Reaction events
  REACTION_ADDED: 'reactionAdded',
  REACTION_REMOVED: 'reactionRemoved',
  
  // Chat events
  CHAT_CREATED: 'chatCreated',
  CHAT_UPDATED: 'chatUpdated',
  CHAT_DELETED: 'chatDeleted',
  JOIN_CHAT: 'joinChat',
  LEAVE_CHAT: 'leaveChat',
  
  // Group events
  PARTICIPANT_ADDED: 'participantAdded',
  PARTICIPANT_REMOVED: 'participantRemoved',
  ADMIN_ADDED: 'adminAdded',
  ADMIN_REMOVED: 'adminRemoved',
  
  // Call events
  CALL_USER: 'callUser',
  INCOMING_CALL: 'incomingCall',
  CALL_ANSWERED: 'callAnswered',
  CALL_REJECTED: 'callRejected',
  CALL_ENDED: 'callEnded',
  ICE_CANDIDATE: 'iceCandidate',
  
  // Error events
  ERROR: 'error'
};

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Error messages
const ERROR_MESSAGES = {
  // Authentication errors
  INVALID_CREDENTIALS: 'Invalid email or password',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Invalid token',
  ACCESS_DENIED: 'Access denied',
  USER_NOT_FOUND: 'User not found',
  ALREADY_EXISTS: 'User already exists',
  
  // Chat errors
  CHAT_NOT_FOUND: 'Chat not found',
  NOT_PARTICIPANT: 'You are not a member of this chat',
  NOT_ADMIN: 'Admin privileges required',
  CANNOT_LEAVE_CHAT: 'Cannot leave this chat',
  
  // Message errors
  MESSAGE_NOT_FOUND: 'Message not found',
  MESSAGE_TOO_LONG: 'Message content too long',
  INVALID_MESSAGE_TYPE: 'Invalid message type',
  
  // File upload errors
  FILE_TOO_LARGE: 'File size too large',
  INVALID_FILE_TYPE: 'Invalid file type',
  UPLOAD_FAILED: 'File upload failed',
  
  // Rate limiting
  TOO_MANY_REQUESTS: 'Too many requests, please try again later',
  
  // Validation errors
  VALIDATION_ERROR: 'Validation error',
  REQUIRED_FIELD: 'This field is required',
  INVALID_FORMAT: 'Invalid format',
  
  // Server errors
  INTERNAL_ERROR: 'Internal server error',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
  DATABASE_ERROR: 'Database connection error'
};

// Success messages
const SUCCESS_MESSAGES = {
  // Authentication
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  REGISTER_SUCCESS: 'Registration successful',
  PROFILE_UPDATED: 'Profile updated successfully',
  PASSWORD_CHANGED: 'Password changed successfully',
  
  // Chat
  CHAT_CREATED: 'Chat created successfully',
  CHAT_UPDATED: 'Chat updated successfully',
  CHAT_DELETED: 'Chat deleted successfully',
  PARTICIPANT_ADDED: 'Participant added successfully',
  PARTICIPANT_REMOVED: 'Participant removed successfully',
  
  // Message
  MESSAGE_SENT: 'Message sent successfully',
  MESSAGE_EDITED: 'Message edited successfully',
  MESSAGE_DELETED: 'Message deleted successfully',
  MESSAGES_MARKED_READ: 'Messages marked as read',
  
  // File upload
  FILE_UPLOADED: 'File uploaded successfully',
  AVATAR_UPDATED: 'Avatar updated successfully',
  
  // Friends
  FRIEND_ADDED: 'Friend added successfully',
  FRIEND_REMOVED: 'Friend removed successfully',
  USER_BLOCKED: 'User blocked successfully',
  USER_UNBLOCKED: 'User unblocked successfully'
};

// File upload limits
const FILE_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_AVATAR_SIZE: 2 * 1024 * 1024, // 2MB
  MAX_GROUP_IMAGE_SIZE: 3 * 1024 * 1024, // 3MB
  MAX_FILES_PER_MESSAGE: 5,
  
  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ],
  
  ALLOWED_FILE_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ]
};

// Pagination defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  MESSAGE_LIMIT: 50,
  SEARCH_LIMIT: 20
};

// Rate limiting
const RATE_LIMITS = {
  GENERAL: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100
  },
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 5
  },
  MESSAGE: {
    WINDOW_MS: 1 * 60 * 1000, // 1 minute
    MAX_REQUESTS: 30
  },
  UPLOAD: {
    WINDOW_MS: 10 * 60 * 1000, // 10 minutes
    MAX_REQUESTS: 10
  }
};

// Validation rules
const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 128,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  EMAIL_MAX_LENGTH: 100,
  MESSAGE_MAX_LENGTH: 1000,
  BIO_MAX_LENGTH: 200,
  CHAT_NAME_MAX_LENGTH: 50,
  CHAT_DESCRIPTION_MAX_LENGTH: 200
};

// Themes
const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
};

// Notification types
const NOTIFICATION_TYPES = {
  MESSAGE: 'message',
  MENTION: 'mention',
  REACTION: 'reaction',
  FRIEND_REQUEST: 'friend_request',
  GROUP_INVITE: 'group_invite'
};

module.exports = {
  MESSAGE_TYPES,
  CHAT_TYPES,
  USER_STATUS,
  SOCKET_EVENTS,
  HTTP_STATUS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  FILE_LIMITS,
  PAGINATION,
  RATE_LIMITS,
  VALIDATION_RULES,
  THEMES,
  NOTIFICATION_TYPES
};