import { ReservationService } from '../../services/ReservationService';
import { PersonRepository } from '../../repositories/PersonRepository';
import { SpaceRepository } from '../../repositories/SpaceRepository';
import { Person, Space, Reservation } from '../../models';
import { CustomError } from '../../middleware/errorHandler';

describe('ReservationService - Business Rules', () => {
  let reservationService: ReservationService;
  let person: any;
  let space: any;

  beforeEach(async () => {
    reservationService = new ReservationService();

    person = await Person.create({
      email: 'client@test.com',
      role: 'client',
    });

    space = await Space.create({
      name: 'Conference Room A',
      location: 'Building 1',
      capacity: 10,
      description: 'Large conference room',
    });
  });

  describe('Conflict Detection', () => {
    it('should prevent overlapping reservations for the same space', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const reservationDate = tomorrow.toISOString().split('T')[0];

      await reservationService.createReservation({
        personId: person.id,
        spaceId: space.id,
        reservationDate,
        startTime: '09:00',
        endTime: '10:00',
      });

      await expect(
        reservationService.createReservation({
          personId: person.id,
          spaceId: space.id,
          reservationDate,
          startTime: '09:30',
          endTime: '10:30',
        })
      ).rejects.toThrow(CustomError);

      await expect(
        reservationService.createReservation({
          personId: person.id,
          spaceId: space.id,
          reservationDate,
          startTime: '09:30',
          endTime: '10:30',
        })
      ).rejects.toThrow(/Time slot conflict detected/);
    });

    it('should allow non-overlapping reservations for the same space', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const reservationDate = tomorrow.toISOString().split('T')[0];

      await reservationService.createReservation({
        personId: person.id,
        spaceId: space.id,
        reservationDate,
        startTime: '09:00',
        endTime: '10:00',
      });

      const reservation2 = await reservationService.createReservation({
        personId: person.id,
        spaceId: space.id,
        reservationDate,
        startTime: '10:00',
        endTime: '11:00',
      });

      expect(reservation2).toBeDefined();
      expect(reservation2.startTime).toBe('10:00');
    });
  });

  describe('3 Reservations Per Week Limit', () => {
    it('should allow up to 3 reservations per week', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      for (let i = 0; i < 3; i++) {
        const reservationDate = new Date(tomorrow);
        reservationDate.setDate(tomorrow.getDate() + i);
        const dateString = reservationDate.toISOString().split('T')[0];

        const reservation = await reservationService.createReservation({
          personId: person.id,
          spaceId: space.id,
          reservationDate: dateString,
          startTime: '09:00',
          endTime: '10:00',
        });

        expect(reservation).toBeDefined();
      }
    });

    it('should prevent 4th reservation in the same week', async () => {
      const monday = new Date();
      const dayOfWeek = monday.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      monday.setDate(monday.getDate() + mondayOffset + 7);

      for (let i = 0; i < 3; i++) {
        const reservationDate = new Date(monday);
        reservationDate.setDate(monday.getDate() + i);
        const dateString = reservationDate.toISOString().split('T')[0];

        await reservationService.createReservation({
          personId: person.id,
          spaceId: space.id,
          reservationDate: dateString,
          startTime: `${9 + i}:00`,
          endTime: `${10 + i}:00`,
        });
      }

      const fourthReservationDate = new Date(monday);
      fourthReservationDate.setDate(monday.getDate() + 3);
      const fourthDateString = fourthReservationDate.toISOString().split('T')[0];

      await expect(
        reservationService.createReservation({
          personId: person.id,
          spaceId: space.id,
          reservationDate: fourthDateString,
          startTime: '12:00',
          endTime: '13:00',
        })
      ).rejects.toThrow(CustomError);

      await expect(
        reservationService.createReservation({
          personId: person.id,
          spaceId: space.id,
          reservationDate: fourthDateString,
          startTime: '12:00',
          endTime: '13:00',
        })
      ).rejects.toThrow(/maximum of 3 reservations/);
    });

    it('should allow reservations in different weeks', async () => {
      const thisWeekMonday = new Date();
      const dayOfWeek = thisWeekMonday.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      thisWeekMonday.setDate(thisWeekMonday.getDate() + mondayOffset + 7);

      for (let i = 0; i < 3; i++) {
        const reservationDate = new Date(thisWeekMonday);
        reservationDate.setDate(thisWeekMonday.getDate() + i);
        const dateString = reservationDate.toISOString().split('T')[0];

        await reservationService.createReservation({
          personId: person.id,
          spaceId: space.id,
          reservationDate: dateString,
          startTime: `${9 + i}:00`,
          endTime: `${10 + i}:00`,
        });
      }

      const nextWeekMonday = new Date(thisWeekMonday);
      nextWeekMonday.setDate(thisWeekMonday.getDate() + 7);
      const nextWeekDateString = nextWeekMonday.toISOString().split('T')[0];

      const nextWeekReservation = await reservationService.createReservation({
        personId: person.id,
        spaceId: space.id,
        reservationDate: nextWeekDateString,
        startTime: '09:00',
        endTime: '10:00',
      });

      expect(nextWeekReservation).toBeDefined();
    });
  });

  describe('Validation Tests', () => {
    it('should validate date format', async () => {
      await expect(
        reservationService.createReservation({
          personId: person.id,
          spaceId: space.id,
          reservationDate: '2024/12/25',
          startTime: '09:00',
          endTime: '10:00',
        })
      ).rejects.toThrow(/Invalid date format/);
    });

    it('should validate time format', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const reservationDate = tomorrow.toISOString().split('T')[0];

      await expect(
        reservationService.createReservation({
          personId: person.id,
          spaceId: space.id,
          reservationDate,
          startTime: '9:00',
          endTime: '10:00',
        })
      ).rejects.toThrow(/Invalid time format/);
    });

    it('should validate that end time is after start time', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const reservationDate = tomorrow.toISOString().split('T')[0];

      await expect(
        reservationService.createReservation({
          personId: person.id,
          spaceId: space.id,
          reservationDate,
          startTime: '10:00',
          endTime: '09:00',
        })
      ).rejects.toThrow(/End time must be after start time/);
    });

    it('should prevent reservations for past dates', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const reservationDate = yesterday.toISOString().split('T')[0];

      await expect(
        reservationService.createReservation({
          personId: person.id,
          spaceId: space.id,
          reservationDate,
          startTime: '09:00',
          endTime: '10:00',
        })
      ).rejects.toThrow(/Cannot create reservations for past dates/);
    });
  });
});