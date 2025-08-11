import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import * as jose from 'jose';
import { authenticateCognito } from '../../middleware/auth';

// Mock jose to avoid actual AWS calls during testing
jest.mock('jose');
const mockedJose = jest.mocked(jose);

describe('Cognito Authentication Integration Tests', () => {
  let app: express.Application;
  
  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Set up environment variables for testing
    process.env.COGNITO_USER_POOL_ID = 'us-east-1_test123';
    process.env.COGNITO_REGION = 'us-east-1';
    process.env.COGNITO_APP_CLIENT_ID = 'test-client-id';
    
    // Protected route for testing
    app.get('/api/protected', authenticateCognito, (req, res) => {
      res.json({
        success: true,
        user: req.user,
        message: 'Access granted'
      });
    });
    
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('JWT Token Verification', () => {
    it('should allow access with valid JWT token', async () => {
      // Mock the JWT verification to succeed
      const mockPayload = {
        sub: 'user123',
        email: 'test@example.com',
        'custom:role': 'client',
        'cognito:username': 'testuser',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000)
      };

      const mockJwks = jest.fn() as any;
      mockedJose.createRemoteJWKSet.mockReturnValue(mockJwks);
      mockedJose.jwtVerify.mockResolvedValue({
        payload: mockPayload,
        protectedHeader: {}
      } as any);

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer valid-jwt-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toEqual(mockPayload);
      expect(response.body.message).toBe('Access granted');
    });

    it('should reject request without JWT token', async () => {
      const response = await request(app)
        .get('/api/protected');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('JWT token is required. Include Authorization: Bearer <token>');
    });

    it('should reject request with invalid JWT token', async () => {
      // Mock JWT verification to fail
      const mockJwks = jest.fn() as any;
      mockedJose.createRemoteJWKSet.mockReturnValue(mockJwks);
      mockedJose.jwtVerify.mockRejectedValue(new Error('Invalid token'));

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid or expired JWT token');
    });

    it('should reject expired JWT token', async () => {
      // Mock JWT verification to fail with expired token
      const expiredError = new Error('Token expired');
      expiredError.name = 'JWTExpired';
      
      const mockJwks = jest.fn() as any;
      mockedJose.createRemoteJWKSet.mockReturnValue(mockJwks);
      mockedJose.jwtVerify.mockRejectedValue(expiredError);

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer expired-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid or expired JWT token');
    });

    it('should handle missing Cognito configuration', async () => {
      // Remove environment variables
      delete process.env.COGNITO_USER_POOL_ID;
      delete process.env.COGNITO_REGION;

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer some-token');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Server configuration error: Cognito settings not configured');
    });

    it('should extract user information from token payload', async () => {
      const mockPayload = {
        sub: 'user456',
        email: 'admin@example.com',
        'custom:role': 'admin',
        'cognito:username': 'adminuser',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000)
      };

      mockedJose.createRemoteJWKSet.mockReturnValue(jest.fn() as any);
      mockedJose.jwtVerify.mockResolvedValue({
        payload: mockPayload,
        protectedHeader: {}
      } as any);

      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer valid-admin-token');

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe('admin@example.com');
      expect(response.body.user['custom:role']).toBe('admin');
      expect(response.body.user.sub).toBe('user456');
    });

    it('should validate token against correct issuer and audience', async () => {
      const mockPayload = {
        sub: 'user123',
        email: 'test@example.com',
        'cognito:username': 'testuser',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000)
      };

      const mockJwks = jest.fn() as any;
      mockedJose.createRemoteJWKSet.mockReturnValue(mockJwks);
      mockedJose.jwtVerify.mockResolvedValue({
        payload: mockPayload,
        protectedHeader: {}
      } as any);

      await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer valid-token');

      expect(mockedJose.jwtVerify).toHaveBeenCalledWith(
        'valid-token',
        mockJwks,
        {
          issuer: 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_test123',
          audience: 'test-client-id'
        }
      );
    });
  });

  describe('Token Format Validation', () => {
    it('should handle malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'InvalidFormat');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('JWT token is required. Include Authorization: Bearer <token>');
    });

    it('should handle empty Bearer token', async () => {
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer ');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('JWT token is required. Include Authorization: Bearer <token>');
    });

    it('should strip Bearer prefix correctly', async () => {
      const mockPayload = {
        sub: 'user123',
        email: 'test@example.com',
        'cognito:username': 'testuser',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000)
      };

      const mockJwks = jest.fn() as any;
      mockedJose.createRemoteJWKSet.mockReturnValue(mockJwks);
      mockedJose.jwtVerify.mockResolvedValue({
        payload: mockPayload,
        protectedHeader: {}
      } as any);

      await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer actual-jwt-token');

      expect(mockedJose.jwtVerify).toHaveBeenCalledWith(
        'actual-jwt-token', // Should have Bearer prefix stripped
        expect.any(Function),
        expect.any(Object)
      );
    });
  });
});