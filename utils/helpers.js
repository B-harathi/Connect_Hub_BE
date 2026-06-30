const crypto = require('crypto');
const { PAGINATION, FILE_LIMITS } = require('./constants');

// Generate random string
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Generate random number
const generateRandomNumber = (min = 1000, max = 9999) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Check if file type is allowed
const isAllowedFileType = (mimeType, allowedTypes = FILE_LIMITS.ALLOWED_FILE_TYPES) => {
  return allowedTypes.includes(mimeType);
};

// Check if file size is within limit
const isFileSizeValid = (size, maxSize = FILE_LIMITS.MAX_FILE_SIZE) => {
  return size <= maxSize;
};

// Sanitize filename
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
};

// Parse pagination parameters
const parsePagination = (page, limit) => {
  const parsedPage = Math.max(1, parseInt(page) || PAGINATION.DEFAULT_PAGE);
  const parsedLimit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, parseInt(limit) || PAGINATION.DEFAULT_LIMIT)
  );
  const skip = (parsedPage - 1) * parsedLimit;
  
  return {
    page: parsedPage,
    limit: parsedLimit,
    skip
  };
};

// Create pagination response
const createPaginationResponse = (data, page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  return {
    data,
    pagination: {
      current: page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null
    }
  };
};

// Format date for display
const formatDate = (date) => {
  if (!date) return null;
  
  const now = new Date();
  const messageDate = new Date(date);
  const diffInMs = now - messageDate;
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    return messageDate.toLocaleDateString();
  }
};

// Format time for display (HH:MM)
const formatTime = (date) => {
  if (!date) return null;
  
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

// Check if date is today
const isToday = (date) => {
  const today = new Date();
  const checkDate = new Date(date);
  
  return today.toDateString() === checkDate.toDateString();
};

// Check if date is yesterday
const isYesterday = (date) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const checkDate = new Date(date);
  
  return yesterday.toDateString() === checkDate.toDateString();
};

// Escape special characters for regex
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Create search regex
const createSearchRegex = (searchTerm, options = 'i') => {
  const escapedTerm = escapeRegex(searchTerm);
  return new RegExp(escapedTerm, options);
};

// Generate unique filename
const generateUniqueFilename = (originalName) => {
  const timestamp = Date.now();
  const randomString = generateRandomString(8);
  const extension = originalName.split('.').pop();
  const nameWithoutExt = originalName.split('.').slice(0, -1).join('.');
  const sanitizedName = sanitizeFilename(nameWithoutExt);
  
  return `${sanitizedName}_${timestamp}_${randomString}.${extension}`;
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
const validatePasswordStrength = (password) => {
  const minLength = 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return {
    isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers,
    checks: {
      minLength: password.length >= minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar
    }
  };
};

// Clean object by removing null/undefined values
const cleanObject = (obj) => {
  const cleaned = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value !== '') {
      if (typeof value === 'object' && !Array.isArray(value)) {
        const cleanedNested = cleanObject(value);
        if (Object.keys(cleanedNested).length > 0) {
          cleaned[key] = cleanedNested;
        }
      } else {
        cleaned[key] = value;
      }
    }
  }
  
  return cleaned;
};

// Deep clone object
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }
  
  if (obj instanceof Object) {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
};

// Generate avatar URL based on name
const generateAvatarUrl = (name) => {
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
    
  const colors = [
    '1abc9c', '2ecc71', '3498db', '9b59b6', 'e74c3c',
    'f39c12', 'e67e22', '95a5a6', '34495e', '16a085'
  ];
  
  const colorIndex = name.length % colors.length;
  const backgroundColor = colors[colorIndex];
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${backgroundColor}&color=fff&size=200`;
};

// Check if user is online (last active within 5 minutes)
const isUserOnline = (lastActive, isOnline = false) => {
  if (!isOnline) return false;
  
  const now = new Date();
  const lastActiveDate = new Date(lastActive);
  const diffInMinutes = (now - lastActiveDate) / (1000 * 60);
  
  return diffInMinutes <= 5;
};

// Get user status text
const getUserStatusText = (isOnline, lastActive) => {
  if (isUserOnline(lastActive, isOnline)) {
    return 'Online';
  }
  
  if (lastActive) {
    const lastActiveDate = new Date(lastActive);
    const now = new Date();
    const diffInMs = now - lastActiveDate;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInMinutes < 60) {
      return `Last seen ${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `Last seen ${diffInHours}h ago`;
    } else if (diffInDays < 7) {
      return `Last seen ${diffInDays}d ago`;
    } else {
      return `Last seen ${lastActiveDate.toLocaleDateString()}`;
    }
  }
  
  return 'Offline';
};

// Truncate text
const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength).trim() + '...';
};

// Generate chat name for private chats
const generatePrivateChatName = (participants, currentUserId) => {
  const otherParticipant = participants.find(
    p => p._id.toString() !== currentUserId.toString()
  );
  
  return otherParticipant ? otherParticipant.name : 'Unknown User';
};

// Get chat display info
const getChatDisplayInfo = (chat, currentUserId) => {
  if (chat.chatType === 'group') {
    return {
      name: chat.chatName || 'Group Chat',
      avatar: chat.chatImage || null,
      description: chat.description || ''
    };
  } else {
    const otherParticipant = chat.participants.find(
      p => p._id.toString() !== currentUserId.toString()
    );
    
    return {
      name: otherParticipant ? otherParticipant.name : 'Unknown User',
      avatar: otherParticipant ? otherParticipant.avatar : null,
      description: otherParticipant ? otherParticipant.bio : ''
    };
  }
};

// Calculate message read percentage
const calculateReadPercentage = (message, totalParticipants) => {
  if (!message.readBy || totalParticipants <= 1) {
    return 0;
  }
  
  // Don't count the sender
  const eligibleRecipients = totalParticipants - 1;
  const readCount = message.readBy.length;
  
  return Math.round((readCount / eligibleRecipients) * 100);
};

// Group messages by date
const groupMessagesByDate = (messages) => {
  const grouped = {};
  
  messages.forEach(message => {
    const messageDate = new Date(message.createdAt);
    const dateKey = messageDate.toDateString();
    
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    
    grouped[dateKey].push(message);
  });
  
  return grouped;
};

// Get file icon based on file type
const getFileIcon = (mimeType) => {
  if (mimeType.startsWith('image/')) {
    return '🖼️';
  } else if (mimeType.startsWith('video/')) {
    return '🎥';
  } else if (mimeType.startsWith('audio/')) {
    return '🎵';
  } else if (mimeType.includes('pdf')) {
    return '📄';
  } else if (mimeType.includes('word') || mimeType.includes('document')) {
    return '📝';
  } else if (mimeType.includes('sheet') || mimeType.includes('excel')) {
    return '📊';
  } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    return '📋';
  } else if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) {
    return '🗂️';
  } else {
    return '📎';
  }
};

// Create error response
const createErrorResponse = (message, errors = null, statusCode = 500) => {
  return {
    success: false,
    message,
    errors,
    statusCode,
    timestamp: new Date().toISOString()
  };
};

// Create success response
const createSuccessResponse = (data = null, message = 'Success', statusCode = 200) => {
  return {
    success: true,
    message,
    data,
    statusCode,
    timestamp: new Date().toISOString()
  };
};

// Validate MongoDB ObjectId
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

// Convert string to slug
const createSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

// Get time difference in human readable format
const getTimeDifference = (startDate, endDate = new Date()) => {
  const diff = endDate - new Date(startDate);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (years > 0) {
    return `${years} year${years > 1 ? 's' : ''} ago`;
  } else if (months > 0) {
    return `${months} month${months > 1 ? 's' : ''} ago`;
  } else if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
};

// Merge objects deeply
const mergeDeep = (target, source) => {
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = mergeDeep(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
};

// Wait for specified time (Promise-based delay)
const delay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Retry function with exponential backoff
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (i === maxRetries - 1) {
        throw lastError;
      }
      
      const delayTime = baseDelay * Math.pow(2, i);
      await delay(delayTime);
    }
  }
  
  throw lastError;
};

module.exports = {
  generateRandomString,
  generateRandomNumber,
  formatFileSize,
  isAllowedFileType,
  isFileSizeValid,
  sanitizeFilename,
  parsePagination,
  createPaginationResponse,
  formatDate,
  formatTime,
  isToday,
  isYesterday,
  escapeRegex,
  createSearchRegex,
  generateUniqueFilename,
  isValidEmail,
  validatePasswordStrength,
  cleanObject,
  deepClone,
  generateAvatarUrl,
  isUserOnline,
  getUserStatusText,
  truncateText,
  generatePrivateChatName,
  getChatDisplayInfo,
  calculateReadPercentage,
  groupMessagesByDate,
  getFileIcon,
  createErrorResponse,
  createSuccessResponse,
  isValidObjectId,
  createSlug,
  getTimeDifference,
  mergeDeep,
  delay,
  retryWithBackoff
};