import { Request, Response } from 'express';
import { PersonService } from '../services/PersonService';
import { asyncHandler } from '../middleware/errorHandler';

export class PersonController {
  private personService: PersonService;

  constructor() {
    this.personService = new PersonService();
  }

  createPerson = asyncHandler(async (req: Request, res: Response) => {
    const person = await this.personService.createPerson(req.body);
    res.status(201).json({
      success: true,
      data: person,
      message: 'Person created successfully',
    });
  });

  getPersons = asyncHandler(async (req: Request, res: Response) => {
    const persons = await this.personService.getPersons();
    res.json({
      success: true,
      data: persons,
    });
  });

  getPersonById = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid person ID. Must be a number.',
      });
    }

    const person = await this.personService.getPersonById(id);
    res.json({
      success: true,
      data: person,
    });
  });

  getPersonByEmail = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.query;
    
    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Email query parameter is required',
      });
    }

    const person = await this.personService.getPersonByEmail(email);
    res.json({
      success: true,
      data: person,
    });
  });

  updatePerson = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid person ID. Must be a number.',
      });
    }

    const person = await this.personService.updatePerson(id, req.body);
    res.json({
      success: true,
      data: person,
      message: 'Person updated successfully',
    });
  });

  deletePerson = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid person ID. Must be a number.',
      });
    }

    await this.personService.deletePerson(id);
    res.json({
      success: true,
      message: 'Person deleted successfully',
    });
  });

  getPersonsByRole = asyncHandler(async (req: Request, res: Response) => {
    const { role } = req.params;
    
    const persons = await this.personService.getPersonsByRole(role);
    res.json({
      success: true,
      data: persons,
    });
  });
}