import { Router } from "express";
import { getAccounts, addAccount, disconnectAccount } from "../controllers/accountController.js";
import { protect } from "../middlewares/authMiddleware.js";

const accountRouter = Router();

accountRouter.use(protect);
accountRouter.get('/', getAccounts);
accountRouter.post('/', addAccount);
accountRouter.delete('/:id', disconnectAccount);

export default accountRouter;