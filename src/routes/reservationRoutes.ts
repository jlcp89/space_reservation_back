import { Router } from 'express';
import { ReservationController } from '../controllers/ReservationController';
import { authenticateCognito } from '../middleware/auth';

const router = Router();
const reservationController = new ReservationController();

// Protected routes - require Cognito authentication
router.post('/', authenticateCognito, reservationController.createReservation);
router.get('/', authenticateCognito, reservationController.getReservations);
router.get('/my-reservations', authenticateCognito, reservationController.getUserReservations);
router.get('/:id', authenticateCognito, reservationController.getReservationById);
router.put('/:id', authenticateCognito, reservationController.updateReservation);
router.delete('/:id', authenticateCognito, reservationController.deleteReservation);

export default router;