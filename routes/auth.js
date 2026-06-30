const express = require('express');
const passport = require('passport');
const router = express.Router();

// Import controllers and middleware
const {
  register,
  login,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  googleCallback,
  verifyToken,
  deleteAccount,
  updateNotificationSettings
} = require('../controllers/authController');

const { authenticate } = require('../middleware/auth');
const { authLimiter, registerLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const {
  validateUserRegistration,
  validateUserLogin,
  validateProfileUpdate,
  validatePasswordChange
} = require('../middleware/validation');

// Public routes
router.post('/register', registerLimiter, validateUserRegistration, register);
router.post('/login', authLimiter, validateUserLogin, login);

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  googleCallback
);

// Protected routes
router.use(authenticate); // All routes below require authentication

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', validateProfileUpdate, updateProfile);
router.put('/password', validatePasswordChange, changePassword);
router.delete('/account', deleteAccount);

// Token verification
router.get('/verify', verifyToken);

// Logout
router.post('/logout', logout);

// Notification settings
router.put('/notifications', updateNotificationSettings);

module.exports = router;