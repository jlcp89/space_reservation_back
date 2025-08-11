import { Person } from '../models';
import { PersonAttributes } from '../types';
import { Op } from 'sequelize';

export class PersonRepository {
  async create(personData: Omit<PersonAttributes, 'id'>): Promise<Person> {
    return await Person.create(personData);
  }

  async findById(id: number): Promise<Person | null> {
    return await Person.findByPk(id);
  }

  async findByEmail(email: string): Promise<Person | null> {
    return await Person.findOne({ where: { email } });
  }

  async findAll(): Promise<Person[]> {
    return await Person.findAll({
      order: [['id', 'ASC']],
    });
  }

  async update(id: number, personData: Partial<PersonAttributes>): Promise<[number, Person[]]> {
    return await Person.update(personData, {
      where: { id },
      returning: true,
    });
  }

  async delete(id: number): Promise<number> {
    return await Person.destroy({ where: { id } });
  }

  async findByRole(role: string): Promise<Person[]> {
    return await Person.findAll({
      where: { role },
      order: [['id', 'ASC']],
    });
  }

  async exists(id: number): Promise<boolean> {
    const person = await Person.findByPk(id, { attributes: ['id'] });
    return person !== null;
  }

  async emailExists(email: string, excludeId?: number): Promise<boolean> {
    const whereClause: any = { email };
    if (excludeId) {
      whereClause.id = { [Op.ne]: excludeId };
    }
    
    const person = await Person.findOne({
      where: whereClause,
      attributes: ['id'],
    });
    return person !== null;
  }
}