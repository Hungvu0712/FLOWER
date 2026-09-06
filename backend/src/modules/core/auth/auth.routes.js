const express = require('express');
const rateLimit = require('express-rate-limit');
const validate = require('../../../middlewares/validate');
const controller = require('./auth.controller');
const {
  registerSchema,
  loginSchema,
  magicLinkRequestSchema,
  magicLinkVerifySchema,
  googleLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require('./auth.validation');

const router = express.Router();

// Chống brute-force cho các endpoint nhạy cảm — xem SECURITY.md §1.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const magicLinkLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false });

router.get('/login-methods', controller.getLoginMethods);
router.post('/register', authLimiter, validate({ body: registerSchema }), controller.register);
router.post('/login', authLimiter, validate({ body: loginSchema }), controller.login);
router.post('/magic-link/request', magicLinkLimiter, validate({ body: magicLinkRequestSchema }), controller.requestMagicLink);
router.post('/magic-link/verify', validate({ body: magicLinkVerifySchema }), controller.verifyMagicLink);
router.post('/google', authLimiter, validate({ body: googleLoginSchema }), controller.googleLogin);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);
router.post('/forgot-password', authLimiter, validate({ body: forgotPasswordSchema }), controller.forgotPassword);
router.post('/reset-password', authLimiter, validate({ body: resetPasswordSchema }), controller.resetPassword);

module.exports = router;
