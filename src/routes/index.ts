import { Router } from 'express';
import personRoutes from './personRoutes';
import spaceRoutes from './spaceRoutes';
import reservationRoutes from './reservationRoutes';
import { authenticateApiKey, authenticateCognito } from '../middleware/auth';

const router = Router();

router.use('/persons', authenticateCognito, personRoutes);
router.use('/spaces', authenticateCognito, spaceRoutes);
router.use('/reservations', reservationRoutes); // Cognito auth handled in reservation routes

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;