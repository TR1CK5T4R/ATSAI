/**
 * courses.routes.js — REST endpoints for the courses module (all require login)
 *
 *   GET    /api/courses                          catalog (?skillTag, limit, offset)
 *   GET    /api/courses/recommend/:interviewId   top 5 courses for an interview's skill gaps (owner or staff)
 *   GET    /api/courses/:id                      one course
 *   POST   /api/courses                          create   (admin)
 *   PATCH  /api/courses/:id                      update   (admin)
 *   DELETE /api/courses/:id                      delete   (admin)
 *   POST   /api/courses/:id/checkout             payment session (mock provider for now)
 */

import express from 'express';
import coursesController from './courses.controller.js';
import validation from './courses.validation.js';
import { validate } from '../../middleware/validate.middleware.js';
import { protect, authorizeRoles } from '../../middleware/auth.middleware.js';

const router = express.Router();
const adminOnly = [protect, authorizeRoles('admin')];

router.get('/', protect, validate(validation.listCourses), coursesController.listCourses);

// Declared BEFORE /:id so "recommend" is not captured as a course id
router.get('/recommend/:interviewId', protect, validate(validation.recommend), coursesController.recommend);

router.get('/:id', protect, validate(validation.byId), coursesController.getCourse);
router.post('/:id/checkout', protect, validate(validation.byId), coursesController.checkout);

router.post('/', ...adminOnly, validate(validation.createCourse), coursesController.createCourse);
router.patch('/:id', ...adminOnly, validate(validation.updateCourse), coursesController.updateCourse);
router.delete('/:id', ...adminOnly, validate(validation.byId), coursesController.deleteCourse);

export default router;
