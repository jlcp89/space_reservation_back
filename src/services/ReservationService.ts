import { ReservationRepository } from '../repositories/ReservationRepository';
import { PersonRepository } from '../repositories/PersonRepository';
import { SpaceRepository } from '../repositories/SpaceRepository';
import { ReservationAttributes, PaginatedResponse } from '../types';
import { CustomError } from '../middleware/errorHandler';

export class ReservationService {
  private reservationRepository: ReservationRepository;
  private personRepository: PersonRepository;
  private spaceRepository: SpaceRepository;

  constructor() {
    this.reservationRepository = new ReservationRepository();
    this.personRepository = new PersonRepository();
    this.spaceRepository = new SpaceRepository();
  }

  private getWeekBounds(date: string): { weekStart: string; weekEnd: string } {
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const monday = new Date(targetDate);
    monday.setDate(targetDate.getDate() + mondayOffset);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
      weekStart: monday.toISOString().split('T')[0],
      weekEnd: sunday.toISOString().split('T')[0],
    };
  }

  private validateTimeFormat(time: string): boolean {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(time);
  }

  private validateDateFormat(date: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) return false;
    
    const parsedDate = new Date(date);
    return !isNaN(parsedDate.getTime()) && date === parsedDate.toISOString().split('T')[0];
  }

  private isEndTimeAfterStartTime(startTime: string, endTime: string): boolean {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    return endMinutes > startMinutes;
  }

  async createReservation(reservationData: Omit<ReservationAttributes, 'id'>): Promise<any> {
    const { personId, spaceId, reservationDate, startTime, endTime } = reservationData;

    if (!this.validateDateFormat(reservationDate)) {
      throw new CustomError('Invalid date format. Use YYYY-MM-DD', 400);
    }

    if (!this.validateTimeFormat(startTime) || !this.validateTimeFormat(endTime)) {
      throw new CustomError('Invalid time format. Use HH:mm', 400);
    }

    if (!this.isEndTimeAfterStartTime(startTime, endTime)) {
      throw new CustomError('End time must be after start time', 400);
    }

    const reservationDateObj = new Date(reservationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (reservationDateObj < today) {
      throw new CustomError('Cannot create reservations for past dates', 400);
    }

    const personExists = await this.personRepository.exists(personId);
    if (!personExists) {
      throw new CustomError('Person not found', 404);
    }

    const spaceExists = await this.spaceRepository.exists(spaceId);
    if (!spaceExists) {
      throw new CustomError('Space not found', 404);
    }

    const conflicts = await this.reservationRepository.findConflictingReservations(
      spaceId,
      reservationDate,
      startTime,
      endTime
    );

    if (conflicts.length > 0) {
      const conflictDetails = conflicts.map(c => 
        `${c.startTime}-${c.endTime} (reserved by ${(c as any).person?.email || 'unknown'})`
      ).join(', ');
      throw new CustomError(
        `Time slot conflict detected for this space on ${reservationDate}. Existing reservations: ${conflictDetails}`,
        409
      );
    }

    const { weekStart, weekEnd } = this.getWeekBounds(reservationDate);
    const weeklyReservationCount = await this.reservationRepository.countByPersonAndWeek(
      personId,
      weekStart,
      weekEnd
    );

    if (weeklyReservationCount >= 3) {
      throw new CustomError(
        `Client has reached the maximum of 3 reservations for the week of ${weekStart} to ${weekEnd}. Current count: ${weeklyReservationCount}`,
        409
      );
    }

    return await this.reservationRepository.create(reservationData);
  }

  async updateReservation(id: number, reservationData: Partial<ReservationAttributes>): Promise<any> {
    const existingReservation = await this.reservationRepository.findById(id);
    if (!existingReservation) {
      throw new CustomError('Reservation not found', 404);
    }

    if (reservationData.reservationDate && !this.validateDateFormat(reservationData.reservationDate)) {
      throw new CustomError('Invalid date format. Use YYYY-MM-DD', 400);
    }

    if (reservationData.startTime && !this.validateTimeFormat(reservationData.startTime)) {
      throw new CustomError('Invalid start time format. Use HH:mm', 400);
    }

    if (reservationData.endTime && !this.validateTimeFormat(reservationData.endTime)) {
      throw new CustomError('Invalid end time format. Use HH:mm', 400);
    }

    const finalStartTime = reservationData.startTime || existingReservation.startTime;
    const finalEndTime = reservationData.endTime || existingReservation.endTime;

    if (!this.isEndTimeAfterStartTime(finalStartTime, finalEndTime)) {
      throw new CustomError('End time must be after start time', 400);
    }

    if (reservationData.personId && reservationData.personId !== existingReservation.personId) {
      const personExists = await this.personRepository.exists(reservationData.personId);
      if (!personExists) {
        throw new CustomError('Person not found', 404);
      }
    }

    if (reservationData.spaceId && reservationData.spaceId !== existingReservation.spaceId) {
      const spaceExists = await this.spaceRepository.exists(reservationData.spaceId);
      if (!spaceExists) {
        throw new CustomError('Space not found', 404);
      }
    }

    const finalSpaceId = reservationData.spaceId || existingReservation.spaceId;
    const finalDate = reservationData.reservationDate || existingReservation.reservationDate;
    const finalPersonId = reservationData.personId || existingReservation.personId;

    const conflicts = await this.reservationRepository.findConflictingReservations(
      finalSpaceId,
      finalDate,
      finalStartTime,
      finalEndTime,
      id
    );

    if (conflicts.length > 0) {
      const conflictDetails = conflicts.map(c => 
        `${c.startTime}-${c.endTime} (reserved by ${(c as any).person?.email || 'unknown'})`
      ).join(', ');
      throw new CustomError(
        `Time slot conflict detected for this space on ${finalDate}. Existing reservations: ${conflictDetails}`,
        409
      );
    }

    if (reservationData.personId || reservationData.reservationDate) {
      const { weekStart, weekEnd } = this.getWeekBounds(finalDate);
      const weeklyReservationCount = await this.reservationRepository.countByPersonAndWeek(
        finalPersonId,
        weekStart,
        weekEnd
      );

      const isChangingToNewPersonOrDate = 
        (reservationData.personId && reservationData.personId !== existingReservation.personId) ||
        (reservationData.reservationDate && reservationData.reservationDate !== existingReservation.reservationDate);

      if (isChangingToNewPersonOrDate && weeklyReservationCount >= 3) {
        throw new CustomError(
          `Client has reached the maximum of 3 reservations for the week of ${weekStart} to ${weekEnd}. Current count: ${weeklyReservationCount}`,
          409
        );
      }
    }

    const [affectedRows, updatedReservations] = await this.reservationRepository.update(id, reservationData);
    if (affectedRows === 0) {
      throw new CustomError('Reservation not found', 404);
    }

    return await this.reservationRepository.findById(id);
  }

  async getReservations(page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<any>> {
    if (page < 1) page = 1;
    if (pageSize < 1 || pageSize > 100) pageSize = 10;

    return await this.reservationRepository.findAll(page, pageSize);
  }

  async getUserReservations(userEmail: string, page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<any>> {
    if (page < 1) page = 1;
    if (pageSize < 1 || pageSize > 100) pageSize = 10;

    // First find the person by email
    const person = await this.personRepository.findByEmail(userEmail);
    if (!person) {
      throw new CustomError('User not found', 404);
    }

    return await this.reservationRepository.findByPersonId(person.id, page, pageSize);
  }

  async getReservationById(id: number): Promise<any> {
    const reservation = await this.reservationRepository.findById(id);
    if (!reservation) {
      throw new CustomError('Reservation not found', 404);
    }
    return reservation;
  }

  async deleteReservation(id: number): Promise<void> {
    const deletedCount = await this.reservationRepository.delete(id);
    if (deletedCount === 0) {
      throw new CustomError('Reservation not found', 404);
    }
  }
}