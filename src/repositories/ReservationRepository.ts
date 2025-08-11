import { Reservation, Person, Space } from '../models';
import { ReservationAttributes, PaginatedResponse } from '../types';
import { Op } from 'sequelize';

export class ReservationRepository {
  async create(reservationData: Omit<ReservationAttributes, 'id'>): Promise<Reservation> {
    return await Reservation.create(reservationData);
  }

  async findById(id: number): Promise<Reservation | null> {
    return await Reservation.findByPk(id, {
      include: [
        { model: Person, as: 'person', attributes: ['id', 'email', 'role'] },
        { model: Space, as: 'space', attributes: ['id', 'name', 'location', 'capacity'] },
      ],
    });
  }

  async findAll(page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<Reservation>> {
    const offset = (page - 1) * pageSize;
    
    const { count, rows } = await Reservation.findAndCountAll({
      include: [
        { model: Person, as: 'person', attributes: ['id', 'email', 'role'] },
        { model: Space, as: 'space', attributes: ['id', 'name', 'location', 'capacity'] },
      ],
      order: [['reservationDate', 'ASC'], ['startTime', 'ASC']],
      limit: pageSize,
      offset,
    });

    return {
      success: true,
      data: rows,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  }

  async update(id: number, reservationData: Partial<ReservationAttributes>): Promise<[number, Reservation[]]> {
    return await Reservation.update(reservationData, {
      where: { id },
      returning: true,
    });
  }

  async delete(id: number): Promise<number> {
    return await Reservation.destroy({ where: { id } });
  }

  async findConflictingReservations(
    spaceId: number,
    reservationDate: string,
    startTime: string,
    endTime: string,
    excludeId?: number
  ): Promise<Reservation[]> {
    const whereClause: any = {
      spaceId,
      reservationDate,
      [Op.or]: [
        {
          [Op.and]: [
            { startTime: { [Op.lt]: endTime } },
            { endTime: { [Op.gt]: startTime } },
          ],
        },
      ],
    };

    if (excludeId) {
      whereClause.id = { [Op.ne]: excludeId };
    }

    return await Reservation.findAll({
      where: whereClause,
      include: [
        { model: Person, as: 'person', attributes: ['id', 'email'] },
        { model: Space, as: 'space', attributes: ['id', 'name'] },
      ],
    });
  }

  async findByPersonAndDateRange(
    personId: number,
    startDate: string,
    endDate: string
  ): Promise<Reservation[]> {
    return await Reservation.findAll({
      where: {
        personId,
        reservationDate: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [['reservationDate', 'ASC'], ['startTime', 'ASC']],
    });
  }

  async countByPersonAndWeek(personId: number, weekStart: string, weekEnd: string): Promise<number> {
    return await Reservation.count({
      where: {
        personId,
        reservationDate: {
          [Op.between]: [weekStart, weekEnd],
        },
      },
    });
  }

  async findBySpaceAndDate(spaceId: number, reservationDate: string): Promise<Reservation[]> {
    return await Reservation.findAll({
      where: {
        spaceId,
        reservationDate,
      },
      include: [
        { model: Person, as: 'person', attributes: ['id', 'email'] },
      ],
      order: [['startTime', 'ASC']],
    });
  }

  async findByPersonId(personId: number, page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<Reservation>> {
    const offset = (page - 1) * pageSize;
    
    const { count, rows } = await Reservation.findAndCountAll({
      where: { personId },
      include: [
        { model: Person, as: 'person', attributes: ['id', 'email', 'role'] },
        { model: Space, as: 'space', attributes: ['id', 'name', 'location', 'capacity'] },
      ],
      order: [['reservationDate', 'DESC'], ['startTime', 'ASC']],
      limit: pageSize,
      offset,
    });

    return {
      success: true,
      data: rows,
      pagination: {
        page,
        pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize),
      },
    };
  }

  async exists(id: number): Promise<boolean> {
    const reservation = await Reservation.findByPk(id, { attributes: ['id'] });
    return reservation !== null;
  }
}