import express from 'express';
import authController from './auth.controller.js';
import validation from './auth.validation.js';
import { protect, } from '../../middleware/auth.middleware.js'; // fixed import

const router = express.Router();

router.post('/register', authController.validate(validation.register.body), authController.register);
router.post('/login', authController.validate(validation.login.body), authController.login);
router.get('/me', protect, authController.getMe);

export default router;
