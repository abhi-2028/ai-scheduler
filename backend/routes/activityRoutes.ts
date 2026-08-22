import { Router } from 'express';
import { getActivity } from '../controllers/activityController.js';
import { protect } from '../middlewares/authMiddleware.js';

const ActivityRouter = Router();

ActivityRouter.use(protect);

ActivityRouter.get('/', getActivity);

export default ActivityRouter;