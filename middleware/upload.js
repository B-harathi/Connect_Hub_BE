const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary');

// File filter for images
const imageFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed.'), false);
  }
};

// File filter for all files
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed'
  ];

  const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

// Cloudinary storage for message images
const messageImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'connecthub/messages/images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [
      { width: 800, height: 600, crop: 'limit' },
      { quality: 'auto:good' }
    ],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      return `msg_img_${timestamp}_${randomString}`;
    },
  },
});

// Cloudinary storage for profile avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'connecthub/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 200, height: 200, crop: 'fill', gravity: 'face' },
      { quality: 'auto:good' }
    ],
    public_id: (req, file) => {
      return `avatar_${req.user._id}_${Date.now()}`;
    },
  },
});

// Cloudinary storage for group chat images
const groupImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'connecthub/groups',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [
      { width: 300, height: 300, crop: 'fill' },
      { quality: 'auto:good' }
    ],
    public_id: (req, file) => {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      return `group_${timestamp}_${randomString}`;
    },
  },
});

// Upload middleware for message images
const uploadMessageImage = multer({
  storage: messageImageStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
  },
  fileFilter: imageFilter,
});

// Upload middleware for profile avatars
const uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB for avatars
  },
  fileFilter: imageFilter,
});

// Upload middleware for group images
const uploadGroupImage = multer({
  storage: groupImageStorage,
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB for group images
  },
  fileFilter: imageFilter,
});

// Local storage fallback (for development without Cloudinary)
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Local upload middleware (fallback)
const uploadLocal = multer({
  storage: localStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
  },
  fileFilter: fileFilter,
});

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size allowed is 5MB.'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded.'
      });
    }
  }

  if (error.message === 'Invalid file type. Only images are allowed.') {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type. Only images are allowed.'
    });
  }

  if (error.message === 'File type not allowed') {
    return res.status(400).json({
      success: false,
      message: 'File type not allowed.'
    });
  }

  // Generic upload error
  return res.status(500).json({
    success: false,
    message: 'File upload failed.',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

// Middleware to validate uploaded file
const validateUploadedFile = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded.'
    });
  }

  // Additional file validation can be added here
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  if (!allowedMimeTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid file type.'
    });
  }

  next();
};

// Middleware to handle multiple file uploads
const uploadMultiple = multer({
  storage: messageImageStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024,
    files: 5 // Maximum 5 files at once
  },
  fileFilter: fileFilter,
});

// Utility function to delete uploaded file (for cleanup on error)
const deleteUploadedFile = async (filePath) => {
  try {
    if (filePath.includes('cloudinary')) {
      // Extract public ID from Cloudinary URL
      const publicId = filePath.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    } else {
      // Delete local file
      const fs = require('fs').promises;
      await fs.unlink(filePath);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

// Middleware to process uploaded file info
const processFileInfo = (req, res, next) => {
  if (req.file) {
    req.fileInfo = {
      url: req.file.path,
      publicId: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype
    };
  }
  next();
};

module.exports = {
  uploadMessageImage,
  uploadAvatar,
  uploadGroupImage,
  uploadLocal,
  uploadMultiple,
  handleUploadError,
  validateUploadedFile,
  deleteUploadedFile,
  processFileInfo,
  imageFilter,
  fileFilter
};