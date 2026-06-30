const jwt = require('jsonwebtoken');
const { authenticate, optionalAuth, generateToken } = require('../../middleware/auth');
const User = require('../../models/User');
const { buildUser } = require('../factories/userFactory');

// Mock request, response, next
const mockRequest = (headers = {}) => ({
  header: jest.fn((name) => headers[name])
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

describe('Auth Middleware', () => {
  let user;

  beforeEach(async () => {
    user = await buildUser();
    mockNext.mockClear();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(user._id);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.id).toBe(user._id.toString());
      expect(decoded.iss).toBe('ConnectHub');
    });
  });

  describe('authenticate', () => {
    it('should authenticate with valid token', async () => {
      const token = generateToken(user._id);
      const req = mockRequest({ Authorization: `Bearer ${token}` });
      const res = mockResponse();

      await authenticate(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user._id.toString()).toBe(user._id.toString());
    });

    it('should fail without token', async () => {
      const req = mockRequest({});
      const res = mockResponse();

      await authenticate(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('No token')
        })
      );
    });

    it('should fail with invalid token format', async () => {
      const req = mockRequest({ Authorization: 'InvalidFormat token' });
      const res = mockResponse();

      await authenticate(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Invalid token format')
        })
      );
    });

    it('should fail with invalid token', async () => {
      const req = mockRequest({ Authorization: 'Bearer invalid.token.here' });
      const res = mockResponse();

      await authenticate(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Invalid token')
        })
      );
    });

    it('should fail with expired token', async () => {
      // Generate an expired token
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );
      const req = mockRequest({ Authorization: `Bearer ${token}` });
      const res = mockResponse();

      await authenticate(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('expired')
        })
      );
    });

    it('should fail when user not found', async () => {
      // Generate token for non-existent user
      const fakeUserId = '507f1f77bcf86cd799439011';
      const token = generateToken(fakeUserId);
      const req = mockRequest({ Authorization: `Bearer ${token}` });
      const res = mockResponse();

      await authenticate(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('user not found')
        })
      );
    });
  });

  describe('optionalAuth', () => {
    it('should authenticate with valid token', async () => {
      const token = generateToken(user._id);
      const req = mockRequest({ Authorization: `Bearer ${token}` });
      const res = mockResponse();

      await optionalAuth(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(req.user).toBeDefined();
    });

    it('should continue without token', async () => {
      const req = mockRequest({});
      const res = mockResponse();

      await optionalAuth(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it('should continue with invalid token', async () => {
      const req = mockRequest({ Authorization: 'Bearer invalid.token' });
      const res = mockResponse();

      await optionalAuth(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it('should continue without Bearer prefix', async () => {
      const token = generateToken(user._id);
      const req = mockRequest({ Authorization: token });
      const res = mockResponse();

      await optionalAuth(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });
  });
});
