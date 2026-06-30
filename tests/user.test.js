const mongoose = require('mongoose');
const User = require('../models/User');

describe('User Model', () => {
  describe('User creation and validation', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser._id).toBeDefined();
      expect(savedUser.name).toBe(userData.name);
      expect(savedUser.email).toBe(userData.email.toLowerCase());
      expect(savedUser.password).not.toBe(userData.password); // Password should be hashed
    });

    it('should hash the password before saving', async () => {
      const userData = {
        name: 'Password Test',
        email: 'passtest@example.com',
        password: 'plainpassword'
      };

      const user = new User(userData);
      await user.save();

      // Use findById with password explicitly selected since select: false is default
      const savedUser = await User.findById(user._id).select('+password');
      expect(savedUser.password).not.toBe(userData.password);
      expect(savedUser.password.length).toBeGreaterThan(50); // bcrypt hash
    });

    it('should fail with duplicate email', async () => {
      const userData = {
        name: 'Duplicate Test',
        email: 'duplicate@example.com',
        password: 'password123'
      };

      await User.create(userData);

      const duplicateUser = new User(userData);
      await expect(duplicateUser.save()).rejects.toThrow();
    });

    it('should fail without required name', async () => {
      const userData = {
        email: 'noname@example.com',
        password: 'password123'
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });
  });

  describe('User methods', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        name: 'Method Test User',
        email: 'method@example.com',
        password: 'password123'
      });
    });

    it('should compare password correctly', async () => {
      const isMatch = await testUser.comparePassword('password123');
      expect(isMatch).toBe(true);

      const isNotMatch = await testUser.comparePassword('wrongpassword');
      expect(isNotMatch).toBe(false);
    });

    it('should get safe data without sensitive fields', () => {
      const safeData = testUser.getSafeData();

      expect(safeData.name).toBeDefined();
      expect(safeData.email).toBeDefined();
      expect(safeData.password).toBeUndefined();
      expect(safeData.googleId).toBeUndefined();
      expect(safeData.socketId).toBeUndefined();
    });

    it('should get virtual profile data', () => {
      const profile = testUser.profile;

      expect(profile._id).toBeDefined();
      expect(profile.name).toBe(testUser.name);
      expect(profile.email).toBe(testUser.email);
      expect(profile.avatar).toBe(testUser.avatar);
      expect(profile.bio).toBe(testUser.bio);
      expect(profile.isOnline).toBe(testUser.isOnline);
    });
  });

  describe('User statics', () => {
    beforeEach(async () => {
      await User.create([
        { name: 'Alice Smith', email: 'alice@test.com', password: 'pass123' },
        { name: 'Bob Jones', email: 'bob@test.com', password: 'pass123' },
        { name: 'Charlie Brown', email: 'charlie@test.com', password: 'pass123' }
      ]);
    });

    it('should search users by name', async () => {
      const results = await User.searchUsers('Alice', new mongoose.Types.ObjectId());
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Alice Smith');
    });

    it('should search users by email', async () => {
      const results = await User.searchUsers('bob@test.com', new mongoose.Types.ObjectId());
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('Bob Jones');
    });

    it('should exclude specified user from search', async () => {
      const userToExclude = await User.findOne({ email: 'alice@test.com' });
      const results = await User.searchUsers('Alice', userToExclude._id);
      expect(results.length).toBe(0);
    });
  });
});
