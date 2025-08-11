import { Request, Response } from 'express';
import { SpaceService } from '../services/SpaceService';
import { asyncHandler } from '../middleware/errorHandler';

export class SpaceController {
  private spaceService: SpaceService;

  constructor() {
    this.spaceService = new SpaceService();
  }

  createSpace = asyncHandler(async (req: Request, res: Response) => {
    const space = await this.spaceService.createSpace(req.body);
    res.status(201).json({
      success: true,
      data: space,
      message: 'Space created successfully',
    });
  });

  getSpaces = asyncHandler(async (req: Request, res: Response) => {
    const { location, minCapacity, maxCapacity } = req.query;

    let spaces;

    if (location && typeof location === 'string') {
      spaces = await this.spaceService.getSpacesByLocation(location);
    } else if (minCapacity) {
      const min = parseInt(minCapacity as string);
      const max = maxCapacity ? parseInt(maxCapacity as string) : undefined;
      
      if (isNaN(min)) {
        return res.status(400).json({
          success: false,
          error: 'minCapacity must be a valid number',
        });
      }

      if (max !== undefined && isNaN(max)) {
        return res.status(400).json({
          success: false,
          error: 'maxCapacity must be a valid number',
        });
      }

      spaces = await this.spaceService.getSpacesByCapacity(min, max);
    } else {
      spaces = await this.spaceService.getSpaces();
    }

    res.json({
      success: true,
      data: spaces,
    });
  });

  getSpaceById = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid space ID. Must be a number.',
      });
    }

    const space = await this.spaceService.getSpaceById(id);
    res.json({
      success: true,
      data: space,
    });
  });

  updateSpace = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid space ID. Must be a number.',
      });
    }

    const space = await this.spaceService.updateSpace(id, req.body);
    res.json({
      success: true,
      data: space,
      message: 'Space updated successfully',
    });
  });

  deleteSpace = asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid space ID. Must be a number.',
      });
    }

    await this.spaceService.deleteSpace(id);
    res.json({
      success: true,
      message: 'Space deleted successfully',
    });
  });
}