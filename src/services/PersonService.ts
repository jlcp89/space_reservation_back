import { PersonRepository } from '../repositories/PersonRepository';
import { PersonAttributes } from '../types';
import { CustomError } from '../middleware/errorHandler';

export class PersonService {
  private personRepository: PersonRepository;

  constructor() {
    this.personRepository = new PersonRepository();
  }

  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private validateRole(role: string): boolean {
    return ['admin', 'client'].includes(role);
  }

  async createPerson(personData: Omit<PersonAttributes, 'id'>): Promise<any> {
    const { email, role } = personData;

    if (!email || !email.trim()) {
      throw new CustomError('Email is required', 400);
    }

    if (!this.validateEmail(email.trim())) {
      throw new CustomError('Invalid email format', 400);
    }

    if (role && !this.validateRole(role)) {
      throw new CustomError('Role must be either "admin" or "client"', 400);
    }

    const emailExists = await this.personRepository.emailExists(email.trim());
    if (emailExists) {
      throw new CustomError('Email already exists', 409);
    }

    const cleanPersonData = {
      email: email.trim().toLowerCase(),
      role: role || 'client',
    };

    return await this.personRepository.create(cleanPersonData);
  }

  async updatePerson(id: number, personData: Partial<PersonAttributes>): Promise<any> {
    if (personData.email) {
      if (!this.validateEmail(personData.email.trim())) {
        throw new CustomError('Invalid email format', 400);
      }

      const emailExists = await this.personRepository.emailExists(personData.email.trim(), id);
      if (emailExists) {
        throw new CustomError('Email already exists', 409);
      }

      personData.email = personData.email.trim().toLowerCase();
    }

    if (personData.role && !this.validateRole(personData.role)) {
      throw new CustomError('Role must be either "admin" or "client"', 400);
    }

    const [affectedRows, updatedPersons] = await this.personRepository.update(id, personData);
    if (affectedRows === 0) {
      throw new CustomError('Person not found', 404);
    }

    return await this.personRepository.findById(id);
  }

  async getPersons(): Promise<any[]> {
    return await this.personRepository.findAll();
  }

  async getPersonById(id: number): Promise<any> {
    const person = await this.personRepository.findById(id);
    if (!person) {
      throw new CustomError('Person not found', 404);
    }
    return person;
  }

  async getPersonByEmail(email: string): Promise<any> {
    if (!this.validateEmail(email)) {
      throw new CustomError('Invalid email format', 400);
    }

    const person = await this.personRepository.findByEmail(email.trim().toLowerCase());
    if (!person) {
      throw new CustomError('Person not found', 404);
    }
    return person;
  }

  async deletePerson(id: number): Promise<void> {
    const deletedCount = await this.personRepository.delete(id);
    if (deletedCount === 0) {
      throw new CustomError('Person not found', 404);
    }
  }

  async getPersonsByRole(role: string): Promise<any[]> {
    if (!this.validateRole(role)) {
      throw new CustomError('Role must be either "admin" or "client"', 400);
    }

    return await this.personRepository.findByRole(role);
  }
}