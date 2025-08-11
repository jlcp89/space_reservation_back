import { Router } from 'express';
import { PersonController } from '../controllers/PersonController';

const router = Router();
const personController = new PersonController();

router.post('/', personController.createPerson);
router.get('/', personController.getPersons);
router.get('/search', personController.getPersonByEmail);
router.get('/role/:role', personController.getPersonsByRole);
router.get('/:id', personController.getPersonById);
router.put('/:id', personController.updatePerson);
router.delete('/:id', personController.deletePerson);

export default router;