import { Router } from 'express';

import {
  adminLoginController,
  chooseRole,
  forgotPasswordController,
  login,
  register,
  resendOtpController,
  resetPasswordController,
  verifyEmailOtp,
  verifyForgotPasswordOtpController,
} from './auth.controller';

const router = Router();
router.post("/admin/login", adminLoginController);

router.post('/register', register);

router.post(
  '/verify-otp',
  verifyEmailOtp,
);
router.post(
  '/resend-otp',
  resendOtpController,
);
router.post(
  '/select-role',
  chooseRole,
);

router.post('/login', login);

router.post(
  '/forgot-password',
  forgotPasswordController,
);

router.post(
  '/verify-forgot-password-otp',
  verifyForgotPasswordOtpController,
);

router.post(
  '/reset-password',
  resetPasswordController,
);

export default router;