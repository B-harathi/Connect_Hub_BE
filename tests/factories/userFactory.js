const User = require('../../models/User');

const buildUser = async (overrides = {}) => {
  // Resolve password - use override or default
  const password = overrides.password || 'Password123';

  // Extract password from overrides to prevent double-hashing
  const { password: _, ...rest } = overrides;

  const userData = {
    name: overrides.name || 'Test User',
    email: overrides.email || `test${Date.now()}@example.com`,
    password: password, // Let User model's pre-save hook hash it
    bio: overrides.bio || 'Test bio',
    avatar: overrides.avatar || null,
    isOnline: overrides.isOnline || false,
    socketId: overrides.socketId || null,
    lastActive: overrides.lastActive || new Date(),
    theme: overrides.theme || 'light',
    notificationSettings: overrides.notificationSettings || {
      email: true,
      push: true,
      sound: true
    },
    ...rest
  };

  const user = new User(userData);
  await user.save();

  // Attach plain password for login tests
  user._plainPassword = password;

  return user;
};

const buildUsers = async (count = 3, overrides = {}) => {
  const users = [];
  for (let i = 0; i < count; i++) {
    const user = await buildUser({
      ...overrides,
      name: `${overrides.name || 'User'}${i}`,
      email: `test${Date.now()}_${i}@example.com`
    });
    users.push(user);
  }
  return users;
};

const buildAdminUser = async (overrides = {}) => {
  return buildUser({
    ...overrides,
    name: 'Admin User',
    email: `admin${Date.now()}@example.com`
  });
};

module.exports = {
  buildUser,
  buildUsers,
  buildAdminUser
};
