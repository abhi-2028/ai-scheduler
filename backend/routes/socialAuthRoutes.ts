import express from 'express';
import { generateAuthUrl, syncAccounts } from '../controllers/socialAuthController.js';
import { protect } from '../middlewares/authMiddleware.js';

const socialAuthRouter = express.Router();

socialAuthRouter.use(protect);
socialAuthRouter.get('/:platform/url', generateAuthUrl);
socialAuthRouter.get('/sync', syncAccounts);

export default socialAuthRouter;