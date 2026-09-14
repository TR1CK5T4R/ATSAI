/**
 * courses.service.js — Course catalog, recommendations and checkout
 *
 *   CRUD           → admin-managed catalog (routes enforce the admin role)
 *   recommend      → interview skillGaps → courses: exact skillTag match first,
 *                    then Gemini semantic fallback for the gaps left over; top 5
 *                    with a "why recommended" line each
 *   checkout       → payment session through services/payments (mock for now)
 */

import crypto from 'node:crypto';
import { Op } from 'sequelize';
import Course from './Course.model.pg.js';
import coursesAi, { normalizeSkill } from './courses.ai.js';
import interviewService from '../interview/interview.service.js';
import payments from '../../services/payments/index.js';
import ApiError from '../../utils/ApiError.js';

const MAX_RECOMMENDATIONS = 5;

// ── CRUD ──────────────────────────────────────────────────────────────────────

const listCourses = async ({ skillTag, limit, offset }) => {
    const where = skillTag ? { skillTag: { [Op.iLike]: skillTag } } : {};
    const { count, rows } = await Course.findAndCountAll({
        where,
        order: [['skillTag', 'ASC'], ['price', 'ASC']],
        limit,
        offset,
    });
    return { total: count, limit, offset, items: rows };
};

const getCourse = async (id) => {
    const course = await Course.findByPk(id);
    if (!course) throw new ApiError(404, 'Course not found');
    return course;
};

/** Duplicate titles surface as SequelizeUniqueConstraintError → 409 in the error handler */
const createCourse = (data) => Course.create(data);

const updateCourse = async (id, data) => {
    const course = await getCourse(id);
    return course.update(data);
};

const deleteCourse = async (id) => {
    const course = await getCourse(id);
    await course.destroy();
};

// ── Recommendations ───────────────────────────────────────────────────────────

const toCourseDto = (c) => ({
    id: c.id,
    title: c.title,
    skillTag: c.skillTag,
    price: c.price,
    currency: c.currency,
    url: c.url,
    description: c.description,
});

/**
 * Pick up to 5 courses, round-robin across gaps (in the order the evaluator
 * listed them, i.e. priority) so one gap can't take every slot.
 * Within a gap: exact before semantic, then cheaper first.
 */
const rankRecommendations = (candidatesByGap) => {
    const queues = candidatesByGap.map((list) =>
        [...list].sort((a, b) => (a.matchType === b.matchType ? a.course.price - b.course.price : a.matchType === 'exact' ? -1 : 1))
    );

    const picked = [];
    const seen = new Set();
    while (picked.length < MAX_RECOMMENDATIONS && queues.some((q) => q.length)) {
        for (const queue of queues) {
            while (queue.length) {
                const next = queue.shift();
                if (seen.has(next.course.id)) continue;
                seen.add(next.course.id);
                picked.push(next);
                break;
            }
            if (picked.length === MAX_RECOMMENDATIONS) break;
        }
    }
    return picked;
};

/**
 * GET /courses/recommend/:interviewId
 * Access: interview owner or staff (same rule as GET /interview/:id).
 */
const recommendForInterview = async (user, interviewId) => {
    const interview = await interviewService.loadInterview(user, interviewId, 'read');
    if (interview.status !== 'completed') {
        throw new ApiError(409, 'Finish the interview first — recommendations are based on its skill gaps');
    }

    const skillGaps = interview.skillGaps || [];
    const base = { interviewId, skillGaps };
    if (!skillGaps.length) {
        return { ...base, semanticMatching: 'skipped', unmatchedGaps: [], recommendations: [] };
    }

    const courses = await Course.findAll();
    const byTag = new Map();
    for (const c of courses) {
        const key = normalizeSkill(c.skillTag);
        if (!byTag.has(key)) byTag.set(key, []);
        byTag.get(key).push(c);
    }

    // 1. Exact match (case/punctuation-insensitive: "node js" == "Node.js")
    const candidatesByGap = skillGaps.map((gap) =>
        (byTag.get(normalizeSkill(gap)) || []).map((course) => ({
            course,
            matchedGap: gap,
            matchType: 'exact',
            why: `Directly targets "${gap}", a skill gap identified in your interview.`,
        }))
    );

    // 2. Semantic fallback (Gemini) for gaps with no exact match
    const unmatched = skillGaps.filter((_, i) => candidatesByGap[i].length === 0);
    const tags = [...new Map(courses.map((c) => [normalizeSkill(c.skillTag), c.skillTag])).values()];
    const semantic = await coursesAi.matchGapsToTags(unmatched, tags);

    for (const m of semantic.matches) {
        if (!m.skillTag) continue;
        const i = skillGaps.indexOf(m.gap);
        candidatesByGap[i] = (byTag.get(normalizeSkill(m.skillTag)) || []).map((course) => ({
            course,
            matchedGap: m.gap,
            matchType: 'semantic',
            why: m.reason || `Closest course to your "${m.gap}" gap.`,
        }));
    }

    const recommendations = rankRecommendations(candidatesByGap).map((r) => ({
        course: toCourseDto(r.course),
        matchedGap: r.matchedGap,
        matchType: r.matchType,
        why: r.why,
    }));

    return {
        ...base,
        semanticMatching: semantic.status,
        unmatchedGaps: skillGaps.filter((_, i) => candidatesByGap[i].length === 0),
        recommendations,
    };
};

// ── Checkout (placeholder) ────────────────────────────────────────────────────

/**
 * POST /courses/:id/checkout — create a payment session for one course.
 * Nothing is persisted yet; see services/payments/index.js for what a real
 * provider needs (Order table + verified webhook).
 */
const createCheckout = async (user, courseId) => {
    const course = await getCourse(courseId);
    if (!(course.price > 0)) {
        throw new ApiError(400, 'This course is free — open it directly from its link');
    }

    return payments.createCheckout({
        orderId: `order_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`,
        amount: Math.round(course.price * 100), // minor units (cents / paise)
        currency: course.currency,
        description: course.title,
        customer: { id: user.id, email: user.email, name: user.name },
        metadata: { courseId: course.id, userId: user.id },
    });
};

export default {
    listCourses,
    getCourse,
    createCourse,
    updateCourse,
    deleteCourse,
    recommendForInterview,
    createCheckout,
};
