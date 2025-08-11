import request from 'supertest';
import express from 'express';
import { sequelize } from '../../config/database';
import { Person, Space, Reservation } from '../../models';
import reservationRoutes from '../../routes/reservationRoutes';
import { errorHandler } from '../../middleware/errorHandler';
import * as jose from 'jose';

// Mock jose to avoid actual AWS calls during testing
jest.mock('jose');
const mockedJose = jest.mocked(jose);

describe('User-Specific Reservations Integration Tests', () => {
  let app: express.Application;
  let testUser: any;
  let testSpace: any;
  let testReservations: any[];

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    
    app = express();
    app.use(express.json());
    
    // Set up environment variables for testing
    process.env.COGNITO_USER_POOL_ID = 'us-east-1_test123';
    process.env.COGNITO_REGION = 'us-east-1';
    process.env.COGNITO_APP_CLIENT_ID = 'test-client-id';
    
    app.use('/api/reservations', reservationRoutes);
    app.use(errorHandler);
  });

  beforeEach(async () => {
    // Clean database before each test
    await Reservation.destroy({ where: {} });
    await Person.destroy({ where: {} });
    await Space.destroy({ where: {} });

    // Create test user
    testUser = await Person.create({
      email: 'testuser@example.com',
      role: 'client'
    });

    // Create test space
    testSpace = await Space.create({
      name: 'Test Meeting Room',
      location: 'Building A, Floor 1',
      capacity: 10,
      description: 'Test room for meetings'
    });

    // Create test reservations for the user
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    testReservations = await Promise.all([
      Reservation.create({
        personId: testUser.id,
        spaceId: testSpace.id,
        reservationDate: today.toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00'
      }),
      Reservation.create({
        personId: testUser.id,
        spaceId: testSpace.id,
        reservationDate: tomorrow.toISOString().split('T')[0],
        startTime: '14:00',
        endTime: '15:00'
      }),
      Reservation.create({
        personId: testUser.id,
        spaceId: testSpace.id,
        reservationDate: nextWeek.toISOString().split('T')[0],
        startTime: '11:00',
        endTime: '12:00'
      })
    ]);

    // Mock successful JWT verification
    const mockPayload = {
      sub: 'user123',
      email: testUser.email,
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

    jest.clearAllMocks();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('GET /api/reservations/my-reservations', () => {
    it('should return user-specific reservations', async () => {
      const response = await request(app)
        .get('/api/reservations/my-reservations')
        .set('Authorization', 'Bearer valid-jwt-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);
      
      // Verify all returned reservations belong to the test user
      response.body.data.forEach((reservation: any) => {
        expect(reservation.personId).toBe(testUser.id);
        expect(reservation.person.email).toBe(testUser.email);
      });
    });

    it('should include space information in reservations', async () => {
      const response = await request(app)
        .get('/api/reservations/my-reservations')
        .set('Authorization', 'Bearer valid-jwt-token');

      expect(response.status).toBe(200);
      expect(response.body.data[0]).toHaveProperty('space');
      expect(response.body.data[0].space).toEqual(
        expect.objectContaining({
          name: testSpace.name,
          location: testSpace.location,
          capacity: testSpace.capacity
        })
      );
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/reservations/my-reservations?page=1&pageSize=2')
        .set('Authorization', 'Bearer valid-jwt-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toEqual({
        page: 1,
        pageSize: 2,
        total: 3,
        totalPages: 2
      });
    });

    it('should return empty array for user with no reservations', async () => {
      // Create a new user with no reservations
      const newUser = await Person.create({
        email: 'newuser@example.com',
        role: 'client'
      });

      // Mock JWT for new user
      mockedJose.jwtVerify.mockResolvedValue({
        payload: {
          sub: 'newuser123',
          email: newUser.email,
          'custom:role': 'client',
          'cognito:username': 'newuser',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000)
        },
        protectedHeader: {}
      } as any);

      const response = await request(app)
        .get('/api/reservations/my-reservations')
        .set('Authorization', 'Bearer valid-jwt-token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
      expect(response.body.pagination.total).toBe(0);
    });

    it('should return 404 for non-existent user', async () => {
      // Mock JWT for non-existent user
      mockedJose.jwtVerify.mockResolvedValue({
        payload: {
          sub: 'nonexistent123',
          email: 'nonexistent@example.com',
          'custom:role': 'client',
          'cognito:username': 'nonexistent',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000)
        },
        protectedHeader: {}
      } as any);

      const response = await request(app)
        .get('/api/reservations/my-reservations')
        .set('Authorization', 'Bearer valid-jwt-token');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not found');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/reservations/my-reservations');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('JWT token is required. Include Authorization: Bearer <token>');
    });

    it('should return 400 if user email not found in token', async () => {
      // Mock JWT without email
      mockedJose.jwtVerify.mockResolvedValue({
        payload: {
          sub: 'user123',
          'custom:role': 'client',
          'cognito:username': 'testuser',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000)
          // Missing email field
        },
        protectedHeader: {}
      } as any);

      const response = await request(app)
        .get('/api/reservations/my-reservations')
        .set('Authorization', 'Bearer valid-jwt-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User email not found in token');
    });

    it('should validate pagination parameters', async () => {
      const response = await request(app)
        .get('/api/reservations/my-reservations?page=0')
        .set('Authorization', 'Bearer valid-jwt-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Page must be a positive integer');
    });

    it('should handle invalid page size', async () => {
      const response = await request(app)
        .get('/api/reservations/my-reservations?page=1&pageSize=150')
        .set('Authorization', 'Bearer valid-jwt-token');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Page size must be between 1 and 100');
    });

    it('should sort reservations by date descending', async () => {
      const response = await request(app)
        .get('/api/reservations/my-reservations')
        .set('Authorization', 'Bearer valid-jwt-token');

      expect(response.status).toBe(200);
      const reservations = response.body.data;
      
      // Check that reservations are sorted by date descending
      for (let i = 0; i < reservations.length - 1; i++) {
        const currentDate = new Date(reservations[i].reservationDate);
        const nextDate = new Date(reservations[i + 1].reservationDate);
        expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
      }
    });

    it('should not return other users reservations', async () => {
      // Create another user with reservations
      const otherUser = await Person.create({
        email: 'otheruser@example.com',
        role: 'client'
      });

      await Reservation.create({
        personId: otherUser.id,
        spaceId: testSpace.id,
        reservationDate: new Date().toISOString().split('T')[0],
        startTime: '16:00',
        endTime: '17:00'
      });

      const response = await request(app)
        .get('/api/reservations/my-reservations')
        .set('Authorization', 'Bearer valid-jwt-token');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(3); // Should still be 3, not 4
      
      // Verify all reservations belong to test user
      response.body.data.forEach((reservation: any) => {
        expect(reservation.personId).toBe(testUser.id);
        expect(reservation.personId).not.toBe(otherUser.id);
      });
    });
  });
});