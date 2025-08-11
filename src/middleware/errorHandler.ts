import { Request, Response, NextFunction } from 'express';
import { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } from 'sequelize';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class CustomError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  if (err instanceof ValidationError) {
    statusCode = 400;
    message = `Validation error: ${err.errors.map(e => e.message).join(', ')}`;
  } else if (err instanceof UniqueConstraintError) {
    statusCode = 409;
    message = `Duplicate entry: ${err.errors.map(e => `${e.path} already exists`).join(', ')}`;
  } else if (err instanceof ForeignKeyConstraintError) {
    statusCode = 400;
    message = 'Invalid reference: The referenced record does not exist';
  }

  if (process.env.NODE_ENV === 'development') {
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      statusCode,
      url: req.url,
      method: req.method,
    });
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};