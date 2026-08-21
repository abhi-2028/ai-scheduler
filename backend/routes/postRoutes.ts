import { Router } from "express";

import { protect } from "../middlewares/authMiddleware.js";
import { generatePost, getGenerations, getPosts, schedulePost } from "../controllers/postController.js";
import upload from "../config/multer.js";

const postRouter = Router();

postRouter.use(protect);
postRouter.get('/', getPosts);
postRouter.get('/generations', getGenerations);
postRouter.post('/', upload.single('image'), schedulePost);
postRouter.post('/generate', generatePost)

export default postRouter;