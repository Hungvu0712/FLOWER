import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../../core/middleware';
import * as controller from './auth.controller';
import {
  registerSchema,
  loginSchema,
  magicLinkRequestSchema,
  magicLinkVerifySchema,
  googleLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validation';

export const authRouter = Router();

// Chống brute-force cho các endpoint nhạy cảm — xem SECURITY.md §1.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const magicLinkLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false });

authRouter.get('/login-methods', controller.getLoginMethods);
authRouter.post('/register', authLimiter, validate({ body: registerSchema }), controller.register);
authRouter.post('/login', authLimiter, validate({ body: loginSchema }), controller.login);
authRouter.post('/magic-link/request', magicLinkLimiter, validate({ body: magicLinkRequestSchema }), controller.requestMagicLink);
authRouter.post('/magic-link/verify', validate({ body: magicLinkVerifySchema }), controller.verifyMagicLink);
authRouter.post('/google', authLimiter, validate({ body: googleLoginSchema }), controller.googleLogin);
authRouter.post('/refresh', controller.refresh);
authRouter.post('/logout', controller.logout);
authRouter.post('/forgot-password', authLimiter, validate({ body: forgotPasswordSchema }), controller.forgotPassword);
authRouter.post('/reset-password', authLimiter, validate({ body: resetPasswordSchema }), controller.resetPassword);
