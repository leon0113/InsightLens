import express from 'express';
import { isAuth } from '../../../middlewares/isAuth.middleware';
import { UserController } from './user.controller';

const router = express.Router();

router.get('/me', isAuth(), UserController.getMyProfile);

export const UserRoutes = router;
