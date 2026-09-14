/**
 * test_interview.js — Automated test suite for the Interview module
 *
 * Verifies:
 *   1. Auth + Joi validation guards (401 / 400)
 *   2. POST /interview/create: ownership of the resume (403/404), 8 planned questions
 *      with a technical/project/behavioral mix, transcript opened in MongoDB
 *   3. POST /interview/:id/answer: user + AI turns saved to Mongo with latencyMs,
 *      one follow-up max per question, replies ≤ 2 sentences, plan advances
 *   4. Authorization: other candidates and recruiters cannot answer/finish;
 *      recruiters can read; candidates don't see upcoming questions
 *   5. Full run to the closing line, then POST /finish: score/strengths/weaknesses/
 *      skillGaps saved to Postgres; finish is idempotent; answers after finish → 409
 *   6. GET /interview/history: own-only for candidates, all + filter for staff
 *   7. LLM failure: create/finish → fast clear 502 (no silent mock);
 *      a live turn falls back to the planned question instead of stalling
 *
 * Needs PostgreSQL and MongoDB. Gemini runs in GEMINI_MOCK mode (deterministic, offline)
 * except section 7. To use a local Mongo instead of the .env one:
 *     MONGO_URI=mongodb://127.0.0.1:27017 npm run test:interview
 */

import 'dotenv/config';
import axios from 'axios';
import mongoose from 'mongoose';
import app from '../src/app.js';
import config from '../src/config/env.js';
import connectMongo from '../src/config/mongo.js';
import { sequelize, User, Resume, Interview } from '../src/models/index.js';
import InterviewChat from '../src/modules/interview/InterviewChat.model.mongo.js';
import { clampSentences } from '../src/modules/interview/interview.ai.js';

const colors = { green: '\x1b[32m', red: '\x1b[31m', cyan: '\x1b[36m', yellow: '\x1b[33m', reset: '\x1b[0m', bold: '\x1b[1m' };
const logPass = (name) => console.log(`  ${colors.green}✔ PASS:${colors.reset} ${name}`);
const logFail = (name, err) => console.error(`  ${colors.red}✖ FAIL:${colors.reset} ${name}\n     ${err.message || err}`);
const logSection = (name) => console.log(`\n${colors.bold}${colors.cyan}▶ ${name}${colors.reset}`);

/** Parsed resume as stored by the resume module (same shape as RESUME_PARSED_SCHEMA) */
const PARSED_RESUME = {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    skills: ['Node.js', 'React', 'PostgreSQL', 'Docker'],
    experience: [{ title: 'Backend Engineer', company: 'Finlytics', startDate: '2022-01', endDate: 'Present', description: 'Payments APIs in Node.js' }],
    education: [{ degree: 'B.Tech CS', institution: 'VTU', year: '2020' }],
    projects: [{ name: 'HireFlow', description: 'ATS screening tool', technologies: ['React', 'Node.js'] }],
    experienceYears: 4,
    seniorityLevel: 'Mid',
};

const LONG_ANSWER =
    'I designed the payments API in Node.js with idempotency keys, wrote integration tests against a real Postgres, ' +
    'and added tracing so we could see slow queries, which cut our p95 latency by forty percent over two sprints.';

const countSentences = (text) => (String(text).match(/[^.!?]+[.!?]+/g) || [String(text)]).length;

async function runTests() {
    console.log(`${colors.bold}${colors.yellow}=====================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.yellow}   AI ATS — Interview Module Test Suite              ${colors.reset}`);
    console.log(`${colors.bold}${colors.yellow}=====================================================${colors.reset}`);

    await sequelize.authenticate();
    // Apply new columns (questions, skill_gaps, ...) — the dev server does the same via sync({ alter: true })
    await Resume.sync({ alter: true });
    await Interview.sync({ alter: true });

    await connectMongo();
    if (mongoose.connection.readyState !== 1) {
        console.error(`${colors.red}MongoDB is not reachable — set MONGO_URI (e.g. MONGO_URI=mongodb://127.0.0.1:27017).${colors.reset}`);
        process.exit(1);
    }

    config.geminiMock = true; // deterministic AI for sections 1–6
    const server = app.listen(0);
    const client = axios.create({ baseURL: `http://127.0.0.1:${server.address().port}`, validateStatus: () => true });
    const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

    const ts = Date.now();
    const users = {
        ada: { name: 'Ada Candidate', email: `int_ada_${ts}@example.com`, password: 'Password123!', role: 'candidate' },
        eve: { name: 'Eve Candidate', email: `int_eve_${ts}@example.com`, password: 'Password123!', role: 'candidate' },
        bob: { name: 'Bob Recruiter', email: `int_bob_${ts}@example.com`, password: 'Password123!', role: 'recruiter' },
    };

    let total = 0;
    let passed = 0;
    const assert = (condition, message) => {
        total++;
        if (!condition) {
            logFail(message, new Error('Assertion failed'));
            throw new Error(`Assertion failed: ${message}`);
        }
        passed++;
        logPass(message);
    };

    try {
        // ── 0. Setup ─────────────────────────────────────────────────────────
        logSection('0. Setup — users and parsed resumes');
        const tokens = {};
        const ids = {};
        for (const [key, data] of Object.entries(users)) {
            const res = await client.post('/auth/register', data);
            assert(res.status === 201, `Registers ${data.role} ${key}`);
            tokens[key] = res.data.token;
            ids[key] = (await User.findOne({ where: { email: data.email } })).id;
        }
        const adaResume = await Resume.create({ userId: ids.ada, parsedJson: PARSED_RESUME, skills: PARSED_RESUME.skills, experienceYears: 4 });
        const eveResume = await Resume.create({ userId: ids.eve, parsedJson: PARSED_RESUME, skills: PARSED_RESUME.skills, experienceYears: 4 });

        // ── 1. Guards ────────────────────────────────────────────────────────
        logSection('1. Auth + validation guards');
        assert((await client.post('/api/interview/create', { resumeId: adaResume.id })).status === 401, 'POST /create without token → 401');
        assert((await client.post('/api/interview/create', { resumeId: 'not-a-uuid' }, auth(tokens.ada))).status === 400, 'POST /create with invalid resumeId → 400');
        assert((await client.get('/api/interview/history?limit=0', auth(tokens.ada))).status === 400, 'GET /history?limit=0 → 400 (query validated)');

        // ── 2. Create ────────────────────────────────────────────────────────
        logSection('2. POST /interview/create');
        assert((await client.post('/api/interview/create', { resumeId: eveResume.id }, auth(tokens.ada))).status === 403, "Can't start an interview from someone else's resume → 403");
        assert((await client.post('/api/interview/create', { resumeId: '11111111-1111-4111-8111-111111111111' }, auth(tokens.ada))).status === 404, 'Unknown resume → 404');

        const createRes = await client.post('/api/interview/create', { resumeId: adaResume.id }, auth(tokens.ada));
        assert(createRes.status === 201, 'Valid create → 201');
        const created = createRes.data.data;
        const interviewId = created.id;
        assert(created.totalQuestions === 8 && created.questionNumber === 1, 'Returns question 1 of 8');
        assert(typeof created.question?.text === 'string' && created.question.text.length > 10, 'Returns the first question text');
        assert(created.targetRole === 'Mid Backend Engineer', `targetRole derived from resume (${created.targetRole})`);
        assert(!('questions' in created), 'Upcoming questions are not sent to the candidate');

        const row = await Interview.findByPk(interviewId);
        assert(row.questions.length === 8, '8 questions stored in Postgres');
        const types = new Set(row.questions.map((q) => q.type));
        assert(['technical', 'project', 'behavioral'].every((t) => types.has(t)), 'Question mix covers technical, project and behavioral');
        let chat = await InterviewChat.findOne({ interviewId }).lean();
        assert(chat?.messages.length === 1 && chat.messages[0].kind === 'question', 'Transcript opened in MongoDB with question 1');

        // ── 3. Answer turns ──────────────────────────────────────────────────
        logSection('3. POST /interview/:id/answer');
        assert((await client.post(`/api/interview/${interviewId}/answer`, { text: '   ' }, auth(tokens.ada))).status === 400, 'Blank answer → 400');

        const short1 = await client.post(`/api/interview/${interviewId}/answer`, { text: 'I used it a bit.' }, auth(tokens.ada));
        assert(short1.status === 200, 'Answer → 200');
        assert(short1.data.data.kind === 'follow_up' && short1.data.data.questionNumber === 1, 'Vague answer gets a follow-up on the same question');
        assert(countSentences(short1.data.data.reply) <= 2, `Follow-up is at most 2 sentences ("${short1.data.data.reply}")`);
        assert(typeof short1.data.data.latencyMs === 'number', `latencyMs returned (${short1.data.data.latencyMs} ms)`);

        const short2 = await client.post(`/api/interview/${interviewId}/answer`, { text: 'Not much more.' }, auth(tokens.ada));
        assert(short2.data.data.kind === 'question' && short2.data.data.questionNumber === 2, 'Max one follow-up per question — moves on to question 2');

        chat = await InterviewChat.findOne({ interviewId }).lean();
        const roles = chat.messages.map((m) => m.role).join(',');
        assert(roles === 'ai,user,ai,user,ai', `User and AI turns saved in order (${roles})`);
        const aiTurns = chat.messages.filter((m) => m.role === 'ai' && m.source !== 'plan');
        assert(aiTurns.every((m) => typeof m.latencyMs === 'number'), 'Every generated AI turn has latencyMs stored');
        assert(chat.messages[1].questionIndex === 0 && chat.messages[3].questionIndex === 0, 'User turns are tagged with their question index');
        assert(clampSentences('One. Two? Three! Four.', 2) === 'One. Two?', 'clampSentences keeps at most N sentences');

        // ── 4. Authorization ─────────────────────────────────────────────────
        logSection('4. Authorization');
        assert((await client.post(`/api/interview/${interviewId}/answer`, { text: 'hi' }, auth(tokens.eve))).status === 403, 'Another candidate cannot answer → 403');
        assert((await client.post(`/api/interview/${interviewId}/answer`, { text: 'hi' }, auth(tokens.bob))).status === 403, 'Recruiter cannot answer → 403');
        assert((await client.post(`/api/interview/${interviewId}/finish`, {}, auth(tokens.bob))).status === 403, 'Recruiter cannot finish → 403');
        assert((await client.get(`/api/interview/${interviewId}`, auth(tokens.eve))).status === 403, "Another candidate cannot view → 403");

        const ownView = await client.get(`/api/interview/${interviewId}`, auth(tokens.ada));
        assert(ownView.status === 200 && ownView.data.data.transcript.length === 5, 'Owner can view interview + transcript');
        assert(ownView.data.data.interview.questions.length === 2, 'Candidate only sees questions asked so far (2 of 8)');
        const staffView = await client.get(`/api/interview/${interviewId}`, auth(tokens.bob));
        assert(staffView.status === 200 && staffView.data.data.interview.questions.length === 8, 'Recruiter can view any interview with all 8 questions');

        // ── 5. Full run + finish ─────────────────────────────────────────────
        logSection('5. Answer to the end, then POST /finish');
        const emptyRes = await client.post('/api/interview/create', { resumeId: adaResume.id }, auth(tokens.ada));
        const emptyId = emptyRes.data.data.id;
        assert((await client.post(`/api/interview/${emptyId}/finish`, {}, auth(tokens.ada))).status === 400, 'Finish with no answers → 400');

        let last;
        for (let i = 0; i < 12 && !last?.done; i++) {
            last = (await client.post(`/api/interview/${interviewId}/answer`, { text: LONG_ANSWER }, auth(tokens.ada))).data.data;
        }
        assert(last?.done === true && last.kind === 'closing', 'Interview reaches the closing line after question 8');
        assert((await client.post(`/api/interview/${interviewId}/answer`, { text: LONG_ANSWER }, auth(tokens.ada))).status === 409, 'Answer after the last question → 409');

        const finishRes = await client.post(`/api/interview/${interviewId}/finish`, {}, auth(tokens.ada));
        assert(finishRes.status === 200, 'Finish → 200');
        const report = finishRes.data.data;
        assert(Number.isInteger(report.score) && report.score >= 0 && report.score <= 100, `score is 0-100 (${report.score})`);
        assert(Array.isArray(report.strengths) && report.strengths.length > 0, 'strengths returned');
        assert(Array.isArray(report.weaknesses) && report.weaknesses.length > 0, 'weaknesses returned');
        assert(Array.isArray(report.skillGaps) && report.skillGaps.length > 0, 'skillGaps[] returned');

        const saved = await Interview.findByPk(interviewId);
        assert(saved.status === 'completed' && saved.score === report.score, 'Score + status saved to Postgres');
        assert(JSON.stringify(saved.skillGaps) === JSON.stringify(report.skillGaps) && saved.completedAt, 'skillGaps + completedAt saved to Postgres');

        const again = await client.post(`/api/interview/${interviewId}/finish`, {}, auth(tokens.ada));
        assert(again.status === 200 && again.data.data.score === report.score, 'Finish is idempotent (same stored report)');
        assert((await client.post(`/api/interview/${interviewId}/answer`, { text: 'more' }, auth(tokens.ada))).status === 409, 'Answer after finish → 409');

        const doneView = await client.get(`/api/interview/${interviewId}`, auth(tokens.ada));
        assert(doneView.data.data.report?.score === report.score, 'GET /:id includes the report once completed');

        // ── 6. History ───────────────────────────────────────────────────────
        logSection('6. GET /interview/history');
        await client.post('/api/interview/create', { resumeId: eveResume.id }, auth(tokens.eve));

        const adaHist = await client.get('/api/interview/history', auth(tokens.ada));
        assert(adaHist.status === 200 && adaHist.data.data.total === 2, `Candidate sees only their own interviews (${adaHist.data.data.total})`);
        assert(adaHist.data.data.items.every((i) => i.userId === ids.ada && !('questions' in i)), 'History items belong to the caller and omit questions');
        const completedOnly = await client.get('/api/interview/history?status=completed', auth(tokens.ada));
        assert(completedOnly.data.data.total === 1, 'status filter works');
        assert((await client.get(`/api/interview/history?userId=${ids.eve}`, auth(tokens.ada))).status === 403, "Candidate cannot read another user's history → 403");

        const staffHist = await client.get(`/api/interview/history?userId=${ids.eve}`, auth(tokens.bob));
        assert(staffHist.status === 200 && staffHist.data.data.total === 1 && staffHist.data.data.items[0].userId === ids.eve, 'Recruiter can filter any candidate history');
        assert(staffHist.data.data.items[0].candidate?.email === users.eve.email, 'Staff history includes the candidate name/email');
        assert(!('candidate' in adaHist.data.data.items[0]), 'Candidate history does not include the candidate object');
        const page = await client.get('/api/interview/history?limit=1&offset=0', auth(tokens.ada));
        assert(page.data.data.items.length === 1 && page.data.data.limit === 1, 'Pagination via limit/offset');

        // ── 7. LLM failures ──────────────────────────────────────────────────
        logSection('7. LLM failure handling (real Gemini path, invalid key)');
        const savedKey = config.geminiApiKey;
        config.geminiMock = false;
        config.geminiApiKey = 'invalid-key-for-interview-test';
        try {
            const started = Date.now();
            const badCreate = await client.post('/api/interview/create', { resumeId: adaResume.id }, auth(tokens.ada));
            assert(badCreate.status === 502 && /misconfigured/i.test(badCreate.data.message), 'Create → clear 502 when Gemini rejects the key');
            assert(Date.now() - started < 1500, 'Permanent errors are not retried with backoff');

            const turn = await client.post(`/api/interview/${emptyId}/answer`, { text: LONG_ANSWER }, auth(tokens.ada));
            assert(turn.status === 200 && turn.data.data.kind === 'question' && turn.data.data.questionNumber === 2, 'Live turn falls back to the next planned question (no stall)');
            const fbChat = await InterviewChat.findOne({ interviewId: emptyId }).lean();
            assert(fbChat.messages.at(-1).source === 'fallback', "Fallback turn is recorded with source 'fallback'");

            const badFinish = await client.post(`/api/interview/${emptyId}/finish`, {}, auth(tokens.ada));
            assert(badFinish.status === 502, 'Finish → 502 when evaluation fails');
            assert((await Interview.findByPk(emptyId)).status === 'ongoing', 'Interview stays ongoing so finish can be retried');
        } finally {
            config.geminiApiKey = savedKey;
            config.geminiMock = true;
        }

        console.log(`\n${colors.bold}${colors.green}=====================================================${colors.reset}`);
        console.log(`${colors.bold}${colors.green}   ALL TESTS PASSED: ${passed}/${total} tests successful!          ${colors.reset}`);
        console.log(`${colors.bold}${colors.green}=====================================================${colors.reset}\n`);
    } catch (err) {
        console.error(`\n${colors.red}${colors.bold}Test Suite Failed:${colors.reset}`, err.message);
        process.exitCode = 1;
    } finally {
        // ── Cleanup ──────────────────────────────────────────────────────────
        try {
            const rows = await User.findAll({ where: { email: Object.values(users).map((u) => u.email) } });
            const userIds = rows.map((u) => u.id);
            if (userIds.length) {
                const interviews = await Interview.findAll({ where: { userId: userIds } });
                await InterviewChat.deleteMany({ interviewId: { $in: interviews.map((i) => i.id) } });
                await Interview.destroy({ where: { userId: userIds } });
                await Resume.destroy({ where: { userId: userIds } });
                await User.destroy({ where: { id: userIds } });
            }
            console.log('🧹  Cleanup complete (test users, resumes, interviews and transcripts removed)');
        } catch (err) {
            console.error('Cleanup failed:', err.message);
        }
        server.close();
        await mongoose.disconnect();
        await sequelize.close();
    }
}

runTests();
