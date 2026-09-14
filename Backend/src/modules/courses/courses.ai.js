/**
 * courses.ai.js — Semantic fallback for course recommendations
 *
 * Only called for skill gaps that have NO exact skillTag match. Gemini picks
 * the closest catalog tag per gap. The response schema restricts `skillTag`
 * to the real catalog tags (plus "NONE"), so it cannot invent a course.
 *
 * Recommendations are a nice-to-have on the results page, so a Gemini failure
 * here degrades to "exact matches only" instead of failing the request.
 * GEMINI_MOCK=true uses a deterministic word-overlap matcher instead.
 */

import { SchemaType } from '@google/generative-ai';
import config from '../../config/env.js';
import { isMockMode, hasValidKey, generateJson, withRetry } from '../../services/llm/gemini.client.js';

const NONE = 'NONE';
const TIMEOUT_MS = 8000;

/** "Node.js" / "NodeJS" / "node js" → "nodejs" (keeps + and # for C++ / C#) */
export const normalizeSkill = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9+#]/g, '');

/** Crude word stems for the mock matcher: "Systems design" → ['system', 'design'] */
const words = (s) =>
    String(s || '')
        .toLowerCase()
        .split(/[^a-z0-9+#]+/)
        .filter((w) => w.length > 1)
        .map((w) => w.replace(/s$/, ''));

const mockMatch = (gaps, tags) =>
    gaps.map((gap) => {
        const gapWords = new Set(words(gap));
        const tag = tags.find((t) => words(t).some((w) => gapWords.has(w)));
        return tag
            ? { gap, skillTag: tag, reason: `${tag} covers the "${gap}" topics your interview showed you should strengthen.` }
            : { gap, skillTag: null, reason: '' };
    });

const buildPrompt = (gaps, tags) => `
You match a candidate's interview skill gaps to a course catalog.
Catalog skill tags: ${JSON.stringify(tags)}
Skill gaps: ${JSON.stringify(gaps)}

For EACH gap return the single catalog tag whose course would most directly help close it,
or "${NONE}" if no tag is genuinely relevant (do not force weak matches).
reason: one short sentence (max 20 words) addressed to the candidate ("you"), saying why this course helps with that gap.`.trim();

/**
 * @param {string[]} gaps - skill gaps without an exact catalog match
 * @param {string[]} tags - distinct catalog skillTags
 * @returns {Promise<{ status: 'ok'|'mock'|'skipped'|'unavailable', matches: Array<{ gap, skillTag: string|null, reason }> }>}
 */
const matchGapsToTags = async (gaps, tags) => {
    if (!gaps.length || !tags.length) return { status: 'skipped', matches: [] };
    if (isMockMode()) return { status: 'mock', matches: mockMatch(gaps, tags) };
    if (!hasValidKey()) return { status: 'unavailable', matches: [] };

    const schema = {
        type: SchemaType.OBJECT,
        properties: {
            matches: {
                type: SchemaType.ARRAY,
                items: {
                    type: SchemaType.OBJECT,
                    properties: {
                        gap: { type: SchemaType.STRING },
                        skillTag: { type: SchemaType.STRING, format: 'enum', enum: [...tags, NONE] },
                        reason: { type: SchemaType.STRING },
                    },
                    required: ['gap', 'skillTag', 'reason'],
                },
            },
        },
        required: ['matches'],
    };

    try {
        const raw = await withRetry(
            () => generateJson({
                prompt: buildPrompt(gaps, tags),
                schema,
                model: config.geminiFastModel,
                temperature: 0.1,
                maxOutputTokens: 600,
                timeoutMs: TIMEOUT_MS,
            }),
            { label: 'course matching', attempts: 2 }
        );

        // Trust nothing: keep only gaps we asked about and tags that really exist
        const tagSet = new Set(tags);
        const matches = gaps.map((gap) => {
            const m = (raw.matches || []).find((x) => normalizeSkill(x.gap) === normalizeSkill(gap));
            const ok = m && m.skillTag !== NONE && tagSet.has(m.skillTag);
            return ok
                ? { gap, skillTag: m.skillTag, reason: String(m.reason || '').trim().slice(0, 200) }
                : { gap, skillTag: null, reason: '' };
        });
        return { status: 'ok', matches };
    } catch (err) {
        console.warn(`⚠️  Semantic course matching unavailable — exact matches only: ${err.message}`);
        return { status: 'unavailable', matches: [] };
    }
};

export default { matchGapsToTags };
