/**
 * gemini.client.js — Shared Gemini wrapper used by every module's *.ai.js
 *
 * Modules keep their own prompts + response schemas; this file owns the
 * plumbing that must behave identically everywhere:
 *   - key checks (placeholder keys never hit the network)
 *   - strict JSON calls (responseMimeType + native responseSchema)
 *   - per-call timeouts (latency-sensitive interview turns)
 *   - retry with exponential backoff, failing fast on permanent 4xx errors
 *   - clean client-facing errors (raw provider details only go to the log)
 *
 * The SDK client is created per call so a key changed in config (or by a
 * test) takes effect immediately; construction is cheap (no network).
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../../config/env.js';
import ApiError from '../../utils/ApiError.js';

const DEFAULT_ATTEMPTS = 3;
const BASE_DELAY_MS = 750; // backoff: 750ms, 1500ms (+ jitter)

/** True only when a real (non-placeholder) Gemini key is configured */
const hasValidKey = () =>
    Boolean(config.geminiApiKey) &&
    !config.geminiApiKey.startsWith('REPLACE_') &&
    config.geminiApiKey !== 'your_gemini_api_key_here';

/** Dev/test switch: modules return deterministic mock output instead of calling Gemini */
const isMockMode = () => config.geminiMock;

/** @throws ApiError 503 when no usable key is configured */
const assertConfigured = () => {
    if (!hasValidKey()) {
        throw new ApiError(
            503,
            'GEMINI_API_KEY is not configured — add it to Backend/.env, or set GEMINI_MOCK=true for offline development'
        );
    }
};

/**
 * Gemini fetch errors carry an HTTP `status`. 400/401/403/404 mean the key,
 * model name or request is wrong — identical on every retry, so stop early.
 * Everything else (429 quota, 5xx, network, bad JSON, schema drift) is retryable.
 */
const PERMANENT_STATUSES = new Set([400, 401, 403, 404]);
const isPermanentError = (err) => PERMANENT_STATUSES.has(err?.status);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One strict-JSON Gemini call.
 * @param {Object} opts
 * @param {string} opts.prompt
 * @param {Object} opts.schema          - native Gemini responseSchema
 * @param {string} [opts.model]         - defaults to GEMINI_MODEL
 * @param {number} [opts.temperature]
 * @param {number} [opts.maxOutputTokens]
 * @param {number} [opts.timeoutMs]     - abort the HTTP call after this long
 * @returns {Promise<Object>} parsed JSON
 */
const generateJson = async ({
    prompt,
    schema,
    model = config.geminiModel,
    temperature = 0.2,
    maxOutputTokens,
    timeoutMs,
}) => {
    const client = new GoogleGenerativeAI(config.geminiApiKey).getGenerativeModel(
        {
            model,
            generationConfig: {
                temperature,
                ...(maxOutputTokens ? { maxOutputTokens } : {}),
                responseMimeType: 'application/json',
                responseSchema: schema,
            },
        },
        timeoutMs ? { timeout: timeoutMs } : undefined
    );

    const result = await client.generateContent(prompt);
    return JSON.parse(result.response.text());
};

/**
 * Run `fn` with retries + exponential backoff and convert the final failure
 * into a clear ApiError(502).
 *
 * @param {(attempt: number) => Promise<T>} fn - throw to trigger a retry
 * @param {{ label: string, attempts?: number }} opts - label is user-facing, e.g. 'resume parsing'
 * @returns {Promise<T>}
 * @template T
 */
const withRetry = async (fn, { label, attempts = DEFAULT_ATTEMPTS }) => {
    let lastError;

    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await fn(attempt);
        } catch (err) {
            lastError = err;
            console.warn(`⚠️  Gemini ${label} failed (attempt ${attempt}/${attempts}): ${err.message}`);

            if (isPermanentError(err)) break;
            if (attempt < attempts) {
                // Exponential backoff + jitter avoids thundering-herd retries
                await sleep(BASE_DELAY_MS * 2 ** (attempt - 1) + Math.random() * 250);
            }
        }
    }

    if (isPermanentError(lastError)) {
        throw new ApiError(
            502,
            `AI ${label} is misconfigured (Gemini returned ${lastError.status}) — check GEMINI_API_KEY and GEMINI_MODEL.`
        );
    }
    throw new ApiError(502, `AI ${label} failed after ${attempts} attempts. Please try again shortly.`);
};

export { hasValidKey, isMockMode, assertConfigured, isPermanentError, generateJson, withRetry };
