/**
 * skills.js — Turn an interview report into chart rows: strengths vs gaps.
 *
 * Inputs (from the report):
 *   skillBreakdown: [{ skill, score }]  — scored skills
 *   skillGaps:      ['System Design', …] — skills the evaluator says to work on
 *
 * A skill is a GAP if the evaluator listed it, or it scores below the target.
 * A skill is a STRENGTH if it scores at or above the strength threshold.
 * Gaps that were never scored still appear (score null) so nothing is hidden.
 */

export const TARGET_SCORE = 70;
export const STRENGTH_SCORE = 75;

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9+#]/g, '');

/** @returns {Array<{ name, score: number|null, target, status: 'strength'|'gap'|'ok' }>} */
export const classifySkills = (skillBreakdown = [], skillGaps = [], target = TARGET_SCORE) => {
    const gapSet = new Set(skillGaps.map(norm));
    const rows = skillBreakdown.map(({ skill, score }) => {
        const isGap = gapSet.has(norm(skill)) || score < target;
        const status = isGap ? 'gap' : score >= STRENGTH_SCORE ? 'strength' : 'ok';
        return { name: skill, score, target, status };
    });

    const scored = new Set(rows.map((r) => norm(r.name)));
    for (const gap of skillGaps) {
        if (!scored.has(norm(gap))) rows.push({ name: gap, score: null, target, status: 'gap' });
    }

    // Strengths first, then OK, then gaps — reads naturally top-to-bottom / clockwise
    const order = { strength: 0, ok: 1, gap: 2 };
    return rows.sort((a, b) => order[a.status] - order[b.status] || (b.score ?? -1) - (a.score ?? -1));
};
