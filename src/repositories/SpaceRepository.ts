import { Space } from '../models';
import { SpaceAttributes } from '../types';

export class SpaceRepository {
  async create(spaceData: Omit<SpaceAttributes, 'id'>): Promise<Space> {
    return await Space.create(spaceData);
  }

  async findById(id: number): Promise<Space | null> {
    return await Space.findByPk(id);
  }

  async findAll(): Promise<Space[]> {
    return await Space.findAll({
      order: [['id', 'ASC']],
    });
  }

  async update(id: number, spaceData: Partial<SpaceAttributes>): Promise<[number, Space[]]> {
    return await Space.update(spaceData, {
      where: { id },
      returning: true,
    });
  }

  async delete(id: number): Promise<number> {
    return await Space.destroy({ where: { id } });
  }

  async exists(id: number): Promise<boolean> {
    const space = await Space.findByPk(id, { attributes: ['id'] });
    return space !== null;
  }

  async findByLocation(location: string): Promise<Space[]> {
    return await Space.findAll({
      where: { location },
      order: [['name', 'ASC']],
    });
  }

  async findByCapacityRange(minCapacity: number, maxCapacity?: number): Promise<Space[]> {
    const whereClause: any = {
      capacity: {
        [Symbol.for('gte')]: minCapacity,
      },
    };

    if (maxCapacity) {
      whereClause.capacity[Symbol.for('lte')] = maxCapacity;
    }

    return await Space.findAll({
      where: whereClause,
      order: [['capacity', 'ASC']],
    });
  }
}