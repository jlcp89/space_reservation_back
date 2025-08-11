import { Router } from 'express';
import { SpaceController } from '../controllers/SpaceController';

const router = Router();
const spaceController = new SpaceController();

router.post('/', spaceController.createSpace);
router.get('/', spaceController.getSpaces);
router.get('/:id', spaceController.getSpaceById);
router.put('/:id', spaceController.updateSpace);
router.delete('/:id', spaceController.deleteSpace);

export default router;