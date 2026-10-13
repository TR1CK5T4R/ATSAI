/**
 * users.routes.js — Routes for user authentication and candidate profile management
 */

import express from 'express';
import usersController from './users.controller.js';
import validation from './users.validation.js';
import validate from '../../middleware/validate.middleware.js';
import { authenticate, authorizeRoles } from '../../middleware/auth.middleware.js';

// ── Auth Router ───────────────────────────────────────────────────────────────
export const authRouter = express.Router();

authRouter.post('/register', validate(validation.register), usersController.register);
authRouter.post('/login', validate(validation.login), usersController.login);
authRouter.post('/refresh', usersController.refreshToken);
authRouter.post('/refresh-token', usersController.refreshToken);
authRouter.post('/logout', usersController.logout);
authRouter.get('/me', authenticate, usersController.getCandidateProfile);

// ── Candidate Router ──────────────────────────────────────────────────────────
export const candidateRouter = express.Router();

candidateRouter.get(
    '/profile',
    authenticate,
    authorizeRoles('candidate'),
    usersController.getCandidateProfile
);

candidateRouter.put(
    '/profile',
    authenticate,
    authorizeRoles('candidate'),
    validate(validation.updateProfile),
    usersController.updateCandidateProfile
);

// ── Users Router (Combines all under /users /api/users) ───────────────────────
const router = express.Router();

router.use('/auth', authRouter);
router.use('/candidate', candidateRouter);

// Direct shortcuts on /users
router.post('/register', validate(validation.register), usersController.register);
router.post('/login', validate(validation.login), usersController.login);
router.get('/profile', authenticate, usersController.getCandidateProfile);
router.put('/profile', authenticate, validate(validation.updateProfile), usersController.updateCandidateProfile);

export default router;
