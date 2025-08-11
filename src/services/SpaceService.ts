import { SpaceRepository } from '../repositories/SpaceRepository';
import { SpaceAttributes } from '../types';
import { CustomError } from '../middleware/errorHandler';

export class SpaceService {
  private spaceRepository: SpaceRepository;

  constructor() {
    this.spaceRepository = new SpaceRepository();
  }

  private validateSpaceData(spaceData: Partial<SpaceAttributes>): void {
    if (spaceData.name !== undefined && (!spaceData.name || !spaceData.name.trim())) {
      throw new CustomError('Space name is required and cannot be empty', 400);
    }

    if (spaceData.location !== undefined && (!spaceData.location || !spaceData.location.trim())) {
      throw new CustomError('Space location is required and cannot be empty', 400);
    }

    if (spaceData.capacity !== undefined) {
      if (!Number.isInteger(spaceData.capacity) || spaceData.capacity < 1) {
        throw new CustomError('Capacity must be a positive integer', 400);
      }
    }

    if (spaceData.description !== undefined && spaceData.description !== null && typeof spaceData.description !== 'string') {
      throw new CustomError('Description must be a string', 400);
    }
  }

  async createSpace(spaceData: Omit<SpaceAttributes, 'id'>): Promise<any> {
    this.validateSpaceData(spaceData);

    const cleanSpaceData = {
      name: spaceData.name.trim(),
      location: spaceData.location.trim(),
      capacity: spaceData.capacity,
      description: spaceData.description?.trim() || null,
    };

    return await this.spaceRepository.create(cleanSpaceData);
  }

  async updateSpace(id: number, spaceData: Partial<SpaceAttributes>): Promise<any> {
    this.validateSpaceData(spaceData);

    const updateData: Partial<SpaceAttributes> = {};

    if (spaceData.name !== undefined) {
      updateData.name = spaceData.name.trim();
    }

    if (spaceData.location !== undefined) {
      updateData.location = spaceData.location.trim();
    }

    if (spaceData.capacity !== undefined) {
      updateData.capacity = spaceData.capacity;
    }

    if (spaceData.description !== undefined) {
      updateData.description = spaceData.description?.trim() || null;
    }

    const [affectedRows] = await this.spaceRepository.update(id, updateData);
    if (affectedRows === 0) {
      throw new CustomError('Space not found', 404);
    }

    return await this.spaceRepository.findById(id);
  }

  async getSpaces(): Promise<any[]> {
    return await this.spaceRepository.findAll();
  }

  async getSpaceById(id: number): Promise<any> {
    const space = await this.spaceRepository.findById(id);
    if (!space) {
      throw new CustomError('Space not found', 404);
    }
    return space;
  }

  async deleteSpace(id: number): Promise<void> {
    const deletedCount = await this.spaceRepository.delete(id);
    if (deletedCount === 0) {
      throw new CustomError('Space not found', 404);
    }
  }

  async getSpacesByLocation(location: string): Promise<any[]> {
    if (!location || !location.trim()) {
      throw new CustomError('Location parameter is required', 400);
    }

    return await this.spaceRepository.findByLocation(location.trim());
  }

  async getSpacesByCapacity(minCapacity: number, maxCapacity?: number): Promise<any[]> {
    if (!Number.isInteger(minCapacity) || minCapacity < 1) {
      throw new CustomError('Min capacity must be a positive integer', 400);
    }

    if (maxCapacity !== undefined && (!Number.isInteger(maxCapacity) || maxCapacity < minCapacity)) {
      throw new CustomError('Max capacity must be a positive integer greater than or equal to min capacity', 400);
    }

    return await this.spaceRepository.findByCapacityRange(minCapacity, maxCapacity);
  }
}