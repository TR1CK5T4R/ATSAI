/**
 * feedback.service.js — Human reviewer feedback on interviews (recruiter/admin)
 *
 * Distinct from the AI report: this is a recruiter's own rating (1–5) and notes.
 * One entry per reviewer per interview; adding again updates the existing one.
 * Reviewer feedback is staff-only — candidates never see recruiters' notes.
 */

import Feedback from './Feedback.model.pg.js';
import Interview from './interview.model.pg.js';
import User from '../users/User.model.js';
import ApiError from '../../utils/ApiError.js';

const REVIEWER_ATTRS = ['id', 'name', 'email'];

const toDto = (f) => ({
    id: f.id,
    interviewId: f.interviewId,
    rating: f.rating,
    comments: f.comments || '',
    reviewer: f.reviewer ? { id: f.reviewer.id, name: f.reviewer.name } : { id: f.reviewerId },
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
});

/**
 * Create or update the caller's feedback for an interview.
 * @returns {Promise<{ feedback, created: boolean }>}
 */
const addFeedback = async (reviewer, { interviewId, rating, comments }) => {
    const interview = await Interview.findByPk(interviewId);
    if (!interview) throw new ApiError(404, 'Interview not found');
    if (interview.status !== 'completed') {
        throw new ApiError(409, 'Feedback can only be left on a completed interview');
    }

    const existing = await Feedback.findOne({ where: { interviewId, reviewerId: reviewer.id } });
    const feedback = existing
        ? await existing.update({ rating, comments })
        : await Feedback.create({ interviewId, reviewerId: reviewer.id, rating, comments });

    await feedback.reload({ include: [{ model: User, as: 'reviewer', attributes: REVIEWER_ATTRS }] });
    return { feedback: toDto(feedback), created: !existing };
};

/** All reviewer feedback for one interview, newest first */
const listForInterview = async (interviewId) => {
    const interview = await Interview.findByPk(interviewId, { attributes: ['id'] });
    if (!interview) throw new ApiError(404, 'Interview not found');

    const rows = await Feedback.findAll({
        where: { interviewId },
        include: [{ model: User, as: 'reviewer', attributes: REVIEWER_ATTRS }],
        order: [['updatedAt', 'DESC']],
    });
    return rows.map(toDto);
};

export default { addFeedback, listForInterview, toDto };
