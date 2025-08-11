import request from 'supertest';
import { app } from '../../index';

describe('E2E Test - Complete Reservation Flow', () => {
  const API_KEY = process.env.API_KEY || 'secure-api-key-2024';

  describe('Complete User Flow: Create Person → Create Space → Make Reservation → Verify Conflict Prevention', () => {
    let personId: number;
    let spaceId: number;
    let reservationId: number;

    it('should complete the full flow successfully', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const reservationDate = tomorrow.toISOString().split('T')[0];

      console.log('Step 1: Creating a client person...');
      const createPersonResponse = await request(app)
        .post('/api/persons')
        .set('X-API-Key', API_KEY)
        .send({
          email: 'client@workspace.com',
          role: 'client',
        })
        .expect(201);

      expect(createPersonResponse.body.success).toBe(true);
      expect(createPersonResponse.body.data.email).toBe('client@workspace.com');
      expect(createPersonResponse.body.data.role).toBe('client');
      personId = createPersonResponse.body.data.id;
      console.log(`✓ Person created with ID: ${personId}`);

      console.log('Step 2: Creating a meeting room space...');
      const createSpaceResponse = await request(app)
        .post('/api/spaces')
        .set('X-API-Key', API_KEY)
        .send({
          name: 'Executive Meeting Room',
          location: 'Floor 5, Building A',
          capacity: 12,
          description: 'Executive meeting room with video conferencing',
        })
        .expect(201);

      expect(createSpaceResponse.body.success).toBe(true);
      expect(createSpaceResponse.body.data.name).toBe('Executive Meeting Room');
      expect(createSpaceResponse.body.data.capacity).toBe(12);
      spaceId = createSpaceResponse.body.data.id;
      console.log(`✓ Space created with ID: ${spaceId}`);

      console.log('Step 3: Creating first reservation...');
      const createReservationResponse = await request(app)
        .post('/api/reservations')
        .set('X-API-Key', API_KEY)
        .send({
          personId: personId,
          spaceId: spaceId,
          reservationDate: reservationDate,
          startTime: '10:00',
          endTime: '11:00',
        })
        .expect(201);

      expect(createReservationResponse.body.success).toBe(true);
      expect(createReservationResponse.body.data.personId).toBe(personId);
      expect(createReservationResponse.body.data.spaceId).toBe(spaceId);
      expect(createReservationResponse.body.data.startTime).toBe('10:00');
      expect(createReservationResponse.body.data.endTime).toBe('11:00');
      reservationId = createReservationResponse.body.data.id;
      console.log(`✓ First reservation created with ID: ${reservationId}`);

      console.log('Step 4: Attempting to create conflicting reservation (should fail)...');
      const conflictReservationResponse = await request(app)
        .post('/api/reservations')
        .set('X-API-Key', API_KEY)
        .send({
          personId: personId,
          spaceId: spaceId,
          reservationDate: reservationDate,
          startTime: '10:30',
          endTime: '11:30',
        })
        .expect(409);

      expect(conflictReservationResponse.body.success).toBe(false);
      expect(conflictReservationResponse.body.error).toMatch(/Time slot conflict detected/);
      expect(conflictReservationResponse.body.error).toMatch(/client@workspace.com/);
      console.log(`✓ Conflict prevention working: ${conflictReservationResponse.body.error}`);

      console.log('Step 5: Creating non-conflicting reservation (should succeed)...');
      const nonConflictReservationResponse = await request(app)
        .post('/api/reservations')
        .set('X-API-Key', API_KEY)
        .send({
          personId: personId,
          spaceId: spaceId,
          reservationDate: reservationDate,
          startTime: '11:00',
          endTime: '12:00',
        })
        .expect(201);

      expect(nonConflictReservationResponse.body.success).toBe(true);
      expect(nonConflictReservationResponse.body.data.startTime).toBe('11:00');
      console.log(`✓ Non-conflicting reservation created successfully`);

      console.log('Step 6: Verifying reservation details with GET...');
      const getReservationResponse = await request(app)
        .get(`/api/reservations/${reservationId}`)
        .set('X-API-Key', API_KEY)
        .expect(200);

      expect(getReservationResponse.body.success).toBe(true);
      expect(getReservationResponse.body.data.person.email).toBe('client@workspace.com');
      expect(getReservationResponse.body.data.space.name).toBe('Executive Meeting Room');
      console.log(`✓ Reservation details verified with associations`);

      console.log('Step 7: Testing weekly limit by creating 2 more reservations...');
      const day2 = new Date(tomorrow);
      day2.setDate(tomorrow.getDate() + 1);
      const day3 = new Date(tomorrow);
      day3.setDate(tomorrow.getDate() + 2);

      await request(app)
        .post('/api/reservations')
        .set('X-API-Key', API_KEY)
        .send({
          personId: personId,
          spaceId: spaceId,
          reservationDate: day2.toISOString().split('T')[0],
          startTime: '14:00',
          endTime: '15:00',
        })
        .expect(201);

      console.log(`✓ Third reservation created (should be at weekly limit now)`);

      console.log('Step 8: Attempting to create 4th reservation in same week (should fail)...');
      const weeklyLimitResponse = await request(app)
        .post('/api/reservations')
        .set('X-API-Key', API_KEY)
        .send({
          personId: personId,
          spaceId: spaceId,
          reservationDate: day3.toISOString().split('T')[0],
          startTime: '16:00',
          endTime: '17:00',
        })
        .expect(409);

      expect(weeklyLimitResponse.body.success).toBe(false);
      expect(weeklyLimitResponse.body.error).toMatch(/maximum of 3 reservations/);
      expect(weeklyLimitResponse.body.error).toMatch(/Current count: 3/);
      console.log(`✓ Weekly limit enforcement working: ${weeklyLimitResponse.body.error}`);

      console.log('Step 9: Testing pagination on reservations list...');
      const paginationResponse = await request(app)
        .get('/api/reservations?page=1&pageSize=2')
        .set('X-API-Key', API_KEY)
        .expect(200);

      expect(paginationResponse.body.success).toBe(true);
      expect(paginationResponse.body.data).toHaveLength(2);
      expect(paginationResponse.body.pagination.page).toBe(1);
      expect(paginationResponse.body.pagination.pageSize).toBe(2);
      expect(paginationResponse.body.pagination.total).toBe(3);
      expect(paginationResponse.body.pagination.totalPages).toBe(2);
      console.log(`✓ Pagination working correctly`);

      console.log('Step 10: Cleaning up - deleting reservation...');
      const deleteResponse = await request(app)
        .delete(`/api/reservations/${reservationId}`)
        .set('X-API-Key', API_KEY)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);
      console.log(`✓ Reservation deleted successfully`);

      console.log('✅ Complete E2E test flow completed successfully!');
      console.log('All business rules verified:');
      console.log('  - Person creation ✓');
      console.log('  - Space creation ✓');
      console.log('  - Reservation creation ✓');
      console.log('  - Conflict detection ✓');
      console.log('  - Weekly limit enforcement ✓');
      console.log('  - Pagination ✓');
      console.log('  - Data associations ✓');
    });

    it('should handle edge case: exact time boundary conflicts', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      const reservationDate = tomorrow.toISOString().split('T')[0];

      const person = await request(app)
        .post('/api/persons')
        .set('X-API-Key', API_KEY)
        .send({ email: 'boundary@test.com', role: 'client' })
        .expect(201);

      const space = await request(app)
        .post('/api/spaces')
        .set('X-API-Key', API_KEY)
        .send({ name: 'Boundary Test Room', location: 'Test Building', capacity: 5 })
        .expect(201);

      await request(app)
        .post('/api/reservations')
        .set('X-API-Key', API_KEY)
        .send({
          personId: person.body.data.id,
          spaceId: space.body.data.id,
          reservationDate,
          startTime: '09:00',
          endTime: '10:00',
        })
        .expect(201);

      const adjacentReservation = await request(app)
        .post('/api/reservations')
        .set('X-API-Key', API_KEY)
        .send({
          personId: person.body.data.id,
          spaceId: space.body.data.id,
          reservationDate,
          startTime: '10:00',
          endTime: '11:00',
        })
        .expect(201);

      expect(adjacentReservation.body.success).toBe(true);
      console.log('✓ Adjacent time slots (09:00-10:00 and 10:00-11:00) work correctly');
    });
  });
});