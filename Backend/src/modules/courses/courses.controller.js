/**
 * courses.controller.js — HTTP handlers for the courses module
 * Thin layer: input is Joi-validated and roles are enforced in the routes.
 */

import catchAsync from '../../utils/catchAsync.js';
import coursesService from './courses.service.js';

/** GET /api/courses?skillTag&limit&offset */
const listCourses = catchAsync(async (req, res) => {
    const data = await coursesService.listCourses(req.query);
    res.status(200).json({ success: true, data });
});

/** GET /api/courses/:id */
const getCourse = catchAsync(async (req, res) => {
    const data = await coursesService.getCourse(req.params.id);
    res.status(200).json({ success: true, data });
});

/** POST /api/courses (admin) */
const createCourse = catchAsync(async (req, res) => {
    const data = await coursesService.createCourse(req.body);
    res.status(201).json({ success: true, data });
});

/** PATCH /api/courses/:id (admin) */
const updateCourse = catchAsync(async (req, res) => {
    const data = await coursesService.updateCourse(req.params.id, req.body);
    res.status(200).json({ success: true, data });
});

/** DELETE /api/courses/:id (admin) */
const deleteCourse = catchAsync(async (req, res) => {
    await coursesService.deleteCourse(req.params.id);
    res.status(204).send();
});

/** GET /api/courses/recommend/:interviewId */
const recommend = catchAsync(async (req, res) => {
    const data = await coursesService.recommendForInterview(req.user, req.params.interviewId);
    res.status(200).json({ success: true, data });
});

/** POST /api/courses/:id/checkout */
const checkout = catchAsync(async (req, res) => {
    const data = await coursesService.createCheckout(req.user, req.params.id);
    res.status(201).json({ success: true, data });
});

export default { listCourses, getCourse, createCourse, updateCourse, deleteCourse, recommend, checkout };
