import { Request, Response } from 'express';
import { ReservationService } from '../services/ReservationService';
import { asyncHandler } from '../middleware/errorHandler';

export class ReservationController {
  private reservationService: ReservationService;

  constructor() {
    this.reservationService = new ReservationService();
  }

  createReservation = asyncHandler(async (req: Request, res: Response) => {
    const reservation = await this.reservationService.createReservation(req.body);
    res.status(201).json({
      success: true,
      data: reservation,
      message: 'Reservation created successfully',
    });
  });

  getReservations = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    if (page < 1) {
      return res.status(400).json({
        success: false,
        error: 'Page must be a positive integer',
      });
    }

    if (pageSize < 1 || pageSize > 100) {
      return res.status(400).json({
        success: false,
        error: 'Page size must be between 1 and 100',
      });
    }

    const result = await this.reservationService.getReservations(page, pageSize);
    res.json(result);
  });

  getReservationById = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reservation ID. Must be a number.',
      });
    }

    const reservation = await this.reservationService.getReservationById(id);
    res.json({
      success: true,
      data: reservation,
    });
  });

  updateReservation = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reservation ID. Must be a number.',
      });
    }

    const reservation = await this.reservationService.updateReservation(id, req.body);
    res.json({
      success: true,
      data: reservation,
      message: 'Reservation updated successfully',
    });
  });

  getUserReservations = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const userEmail = req.user?.email;

    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: 'User email not found in token',
      });
    }

    if (page < 1) {
      return res.status(400).json({
        success: false,
        error: 'Page must be a positive integer',
      });
    }

    if (pageSize < 1 || pageSize > 100) {
      return res.status(400).json({
        success: false,
        error: 'Page size must be between 1 and 100',
      });
    }

    const result = await this.reservationService.getUserReservations(userEmail, page, pageSize);
    res.json(result);
  });

  deleteReservation = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid reservation ID. Must be a number.',
      });
    }

    await this.reservationService.deleteReservation(id);
    res.json({
      success: true,
      message: 'Reservation deleted successfully',
    });
  });
}