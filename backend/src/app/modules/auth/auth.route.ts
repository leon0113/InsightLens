import express from 'express';
import { isAuth } from '../../middlewares/isAuth.middleware';
import validationRequest from '../../middlewares/validationRequest';
import { AuthController } from './auth.controller';
import { AuthValidation } from './auth.validation';

const router = express.Router();

router.post(
  '/register',
  validationRequest(AuthValidation.registerSchema),
  AuthController.register,
);
router.post(
  '/login',
  validationRequest(AuthValidation.loginSchema),
  AuthController.login,
);
router.post('/refresh-token', AuthController.refreshToken);
router.post(
  '/change-password',
  isAuth(),
  validationRequest(AuthValidation.changePasswordSchema),
  AuthController.changePassword,
);
router.post('/log-out', isAuth(), AuthController.logOut);

export const AuthRoutes = router;
