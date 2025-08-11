import request from 'supertest';
import { app } from '../../index';

describe('Integration Tests - Persons API', () => {
  const API_KEY = process.env.API_KEY || 'secure-api-key-2024';

  describe('POST /api/persons', () => {
    it('should create a new person with valid data', async () => {
      const personData = {
        email: 'admin@example.com',
        role: 'admin',
      };

      const response = await request(app)
        .post('/api/persons')
        .set('X-API-Key', API_KEY)
        .send(personData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Person created successfully',
        data: {
          id: expect.any(Number),
          email: 'admin@example.com',
          role: 'admin',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      });
    });

    it('should create a person with default client role', async () => {
      const personData = {
        email: 'client@example.com',
      };

      const response = await request(app)
        .post('/api/persons')
        .set('X-API-Key', API_KEY)
        .send(personData)
        .expect(201);

      expect(response.body.data.role).toBe('client');
    });

    it('should return 400 for invalid email format', async () => {
      const personData = {
        email: 'invalid-email',
        role: 'client',
      };

      const response = await request(app)
        .post('/api/persons')
        .set('X-API-Key', API_KEY)
        .send(personData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid email format'),
      });
    });

    it('should return 409 for duplicate email', async () => {
      const personData = {
        email: 'duplicate@example.com',
        role: 'client',
      };

      await request(app)
        .post('/api/persons')
        .set('X-API-Key', API_KEY)
        .send(personData)
        .expect(201);

      const response = await request(app)
        .post('/api/persons')
        .set('X-API-Key', API_KEY)
        .send(personData)
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Email already exists'),
      });
    });

    it('should return 401 without API key', async () => {
      const personData = {
        email: 'test@example.com',
        role: 'client',
      };

      const response = await request(app)
        .post('/api/persons')
        .send(personData)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('API key is required'),
      });
    });

    it('should return 401 with invalid API key', async () => {
      const personData = {
        email: 'test@example.com',
        role: 'client',
      };

      const response = await request(app)
        .post('/api/persons')
        .set('X-API-Key', 'invalid-key')
        .send(personData)
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid API key'),
      });
    });
  });

  describe('GET /api/persons', () => {
    it('should return all persons', async () => {
      await request(app)
        .post('/api/persons')
        .set('X-API-Key', API_KEY)
        .send({ email: 'person1@example.com', role: 'admin' });

      await request(app)
        .post('/api/persons')
        .set('X-API-Key', API_KEY)
        .send({ email: 'person2@example.com', role: 'client' });

      const response = await request(app)
        .get('/api/persons')
        .set('X-API-Key', API_KEY)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            email: 'person1@example.com',
            role: 'admin',
          }),
          expect.objectContaining({
            email: 'person2@example.com',
            role: 'client',
          }),
        ]),
      });

      expect(response.body.data).toHaveLength(2);
    });

    it('should return empty array when no persons exist', async () => {
      const response = await request(app)
        .get('/api/persons')
        .set('X-API-Key', API_KEY)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: [],
      });
    });
  });

  describe('GET /api/persons/:id', () => {
    it('should return person by id', async () => {
      const createResponse = await request(app)
        .post('/api/persons')
        .set('X-API-Key', API_KEY)
        .send({ email: 'gettest@example.com', role: 'client' });

      const personId = createResponse.body.data.id;

      const response = await request(app)
        .get(`/api/persons/${personId}`)
        .set('X-API-Key', API_KEY)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: personId,
          email: 'gettest@example.com',
          role: 'client',
        },
      });
    });

    it('should return 404 for non-existent person', async () => {
      const response = await request(app)
        .get('/api/persons/999')
        .set('X-API-Key', API_KEY)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Person not found'),
      });
    });

    it('should return 400 for invalid id format', async () => {
      const response = await request(app)
        .get('/api/persons/invalid-id')
        .set('X-API-Key', API_KEY)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Invalid person ID'),
      });
    });
  });

  describe('PUT /api/persons/:id', () => {
    it('should update person successfully', async () => {
      const createResponse = await request(app)
        .post('/api/persons')
        .set('X-API-Key', API_KEY)
        .send({ email: 'update@example.com', role: 'client' });

      const personId = createResponse.body.data.id;

      const response = await request(app)
        .put(`/api/persons/${personId}`)
        .set('X-API-Key', API_KEY)
        .send({ role: 'admin' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Person updated successfully',
        data: {
          id: personId,
          email: 'update@example.com',
          role: 'admin',
        },
      });
    });

    it('should return 404 for updating non-existent person', async () => {
      const response = await request(app)
        .put('/api/persons/999')
        .set('X-API-Key', API_KEY)
        .send({ role: 'admin' })
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Person not found'),
      });
    });
  });

  describe('DELETE /api/persons/:id', () => {
    it('should delete person successfully', async () => {
      const createResponse = await request(app)
        .post('/api/persons')
        .set('X-API-Key', API_KEY)
        .send({ email: 'delete@example.com', role: 'client' });

      const personId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/persons/${personId}`)
        .set('X-API-Key', API_KEY)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Person deleted successfully',
      });

      await request(app)
        .get(`/api/persons/${personId}`)
        .set('X-API-Key', API_KEY)
        .expect(404);
    });

    it('should return 404 for deleting non-existent person', async () => {
      const response = await request(app)
        .delete('/api/persons/999')
        .set('X-API-Key', API_KEY)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.stringContaining('Person not found'),
      });
    });
  });
});