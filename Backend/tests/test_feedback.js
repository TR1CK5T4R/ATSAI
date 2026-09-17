/**
 * test_feedback.js — Reviewer feedback + recruiter candidate list
 *
 * Verifies:
 *   1. POST /api/feedback/add — staff only, completed interviews only, Joi validation,
 *      one entry per reviewer (re-submit updates → 200), separate entries per reviewer
 *   2. GET /api/feedback/interview/:id — staff only, reviewer names, newest first
 *   3. GET /api/interview/history (staff) includes each interview's feedback
 *   4. GET /api/users/candidates — staff only, per-candidate counts / avg / best / latest,
 *      search, pagination, candidates without interviews
 *
 * Needs PostgreSQL only.
 */

import 'dotenv/config';
import axios from 'axios';
import app from '../src/app.js';
import { sequelize, User, Interview, Feedback } from '../src/models/index.js';

const colors = { green: '\x1b[32m', red: '\x1b[31m', cyan: '\x1b[36m', yellow: '\x1b[33m', reset: '\x1b[0m', bold: '\x1b[1m' };
const logPass = (name) => console.log(`  ${colors.green}✔ PASS:${colors.reset} ${name}`);
const logFail = (name, err) => console.error(`  ${colors.red}✖ FAIL:${colors.reset} ${name}\n     ${err.message || err}`);
const logSection = (name) => console.log(`\n${colors.bold}${colors.cyan}▶ ${name}${colors.reset}`);

async function runTests() {
    console.log(`${colors.bold}${colors.yellow}   AI ATS — Feedback & Candidates Test Suite${colors.reset}`);

    await sequelize.authenticate();
    await Interview.sync({ alter: true });
    await Feedback.sync({ alter: true }); // unique (interview_id, reviewer_id)

    const server = app.listen(0);
    const client = axios.create({ baseURL: `http://127.0.0.1:${server.address().port}`, validateStatus: () => true });
    const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

    const ts = Date.now();
    const tag = `fb${ts}`;
    const people = {
        ada: { name: `Ada ${tag}`, role: 'candidate' },
        eve: { name: `Eve ${tag}`, role: 'candidate' },
        zed: { name: `Zed ${tag}`, role: 'candidate' }, // no interviews
        bob: { name: `Bob ${tag}`, role: 'recruiter' },
        ray: { name: `Ray ${tag}`, role: 'recruiter' },
    };
    const emails = Object.fromEntries(Object.keys(people).map((k) => [k, `${k}_${tag}@example.com`]));

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
        logSection('0. Setup');
        const tokens = {};
        const ids = {};
        for (const [key, p] of Object.entries(people)) {
            const res = await client.post('/auth/register', { name: p.name, email: emails[key], password: 'Password123!', role: p.role });
            assert(res.status === 201, `Registers ${p.role} ${key}`);
            tokens[key] = res.data.token;
            ids[key] = res.data.user.id;
        }
        const day = (n) => new Date(Date.now() - n * 86_400_000);
        const adaOld = await Interview.create({ userId: ids.ada, status: 'completed', questions: [], score: 60, targetRole: 'Backend', completedAt: day(3), createdAt: day(3) });
        const adaNew = await Interview.create({ userId: ids.ada, status: 'completed', questions: [], score: 81, targetRole: 'Backend', completedAt: day(1), createdAt: day(1) });
        const adaOngoing = await Interview.create({ userId: ids.ada, status: 'ongoing', questions: [] });
        await Interview.create({ userId: ids.eve, status: 'completed', questions: [], score: 45, completedAt: day(2) });

        // ── 1. Add feedback ──────────────────────────────────────────────────
        logSection('1. POST /api/feedback/add');
        const body = { interviewId: adaNew.id, rating: 4, comments: 'Clear answers, light on testing.' };
        assert((await client.post('/api/feedback/add', body)).status === 401, 'No token → 401');
        assert((await client.post('/api/feedback/add', body, auth(tokens.ada))).status === 403, 'Candidate cannot leave feedback → 403');
        assert((await client.post('/api/feedback/add', { ...body, rating: 6 }, auth(tokens.bob))).status === 400, 'Rating 6 → 400');
        assert((await client.post('/api/feedback/add', { ...body, interviewId: 'nope' }, auth(tokens.bob))).status === 400, 'Invalid interviewId → 400');
        assert((await client.post('/api/feedback/add', { ...body, interviewId: '11111111-1111-4111-8111-111111111111' }, auth(tokens.bob))).status === 404, 'Unknown interview → 404');
        assert((await client.post('/api/feedback/add', { ...body, interviewId: adaOngoing.id }, auth(tokens.bob))).status === 409, 'Ongoing interview → 409');

        const created = await client.post('/api/feedback/add', body, auth(tokens.bob));
        assert(created.status === 201, 'Recruiter adds feedback → 201');
        assert(created.data.data.rating === 4 && created.data.data.reviewer.name === people.bob.name, 'Response includes rating and reviewer name');

        const updated = await client.post('/api/feedback/add', { ...body, rating: 5, comments: 'Revised after review.' }, auth(tokens.bob));
        assert(updated.status === 200 && updated.data.data.id === created.data.data.id && updated.data.data.rating === 5, 'Same reviewer again → updates (200), no duplicate');

        const second = await client.post('/api/feedback/add', { interviewId: adaNew.id, rating: 3 }, auth(tokens.ray));
        assert(second.status === 201 && second.data.data.comments === '', 'Another reviewer adds a separate entry (comments optional)');

        // ── 2. List ──────────────────────────────────────────────────────────
        logSection('2. GET /api/feedback/interview/:id');
        assert((await client.get(`/api/feedback/interview/${adaNew.id}`, auth(tokens.ada))).status === 403, 'Candidate cannot read reviewer notes → 403');
        const list = await client.get(`/api/feedback/interview/${adaNew.id}`, auth(tokens.bob));
        assert(list.status === 200 && list.data.data.length === 2, 'Lists both reviewers');
        assert(list.data.data[0].reviewer.name === people.ray.name, 'Newest first, with reviewer names');

        // ── 3. History includes feedback for staff ───────────────────────────
        logSection('3. Staff history includes feedback');
        const hist = await client.get(`/api/interview/history?userId=${ids.ada}`, auth(tokens.bob));
        assert(hist.status === 200 && hist.data.data.total === 3, `Staff history for the candidate (${hist.data.data.total})`);
        const row = hist.data.data.items.find((i) => i.id === adaNew.id);
        assert(row.feedbacks.length === 2 && row.feedbacks.every((f) => f.reviewer?.name), 'Each interview carries its reviewer feedback');
        const own = await client.get('/api/interview/history', auth(tokens.ada));
        assert(own.data.data.items.every((i) => !('feedbacks' in i)), "Candidates' own history does not expose reviewer notes");

        // ── 4. Candidates list ───────────────────────────────────────────────
        logSection('4. GET /api/users/candidates');
        assert((await client.get('/api/users/candidates', auth(tokens.ada))).status === 403, 'Candidate cannot list candidates → 403');
        assert((await client.get('/api/users/candidates?limit=0', auth(tokens.bob))).status === 400, 'limit=0 → 400');

        const cands = await client.get(`/api/users/candidates?q=${tag}`, auth(tokens.bob));
        assert(cands.status === 200 && cands.data.data.total === 3, `Search finds only this run's 3 candidates (${cands.data.data.total})`);
        const byName = Object.fromEntries(cands.data.data.items.map((c) => [c.name, c]));
        const ada = byName[people.ada.name];
        assert(ada.interviewCount === 3 && ada.completedCount === 2, 'Ada: 3 interviews, 2 completed');
        assert(ada.avgScore === 71 && ada.bestScore === 81, `Ada: avg 71 (60, 81), best 81 (got ${ada.avgScore}/${ada.bestScore})`);
        assert(ada.latest?.interviewId === adaNew.id && ada.latest.score === 81, 'Ada: latest completed interview + score');
        const zed = byName[people.zed.name];
        assert(zed.interviewCount === 0 && zed.avgScore === null && zed.latest === null, 'Candidates without interviews are listed with empty stats');
        assert(!byName[people.bob.name], 'Recruiters are not listed as candidates');

        const page = await client.get(`/api/users/candidates?q=${tag}&limit=2&offset=2`, auth(tokens.ray));
        assert(page.data.data.items.length === 1 && page.data.data.total === 3, 'Pagination via limit/offset');

        console.log(`\n${colors.bold}${colors.green}   ALL TESTS PASSED: ${passed}/${total} tests successful!${colors.reset}\n`);
    } catch (err) {
        console.error(`\n${colors.red}${colors.bold}Test Suite Failed:${colors.reset}`, err.message);
        process.exitCode = 1;
    } finally {
        try {
            const users = await User.findAll({ where: { email: Object.values(emails) } });
            const userIds = users.map((u) => u.id);
            await Interview.destroy({ where: { userId: userIds } }); // feedback cascades
            await User.destroy({ where: { id: userIds } });
            console.log('🧹  Cleanup complete');
        } catch (err) {
            console.error('Cleanup failed:', err.message);
        }
        server.close();
        await sequelize.close();
    }
}

runTests();
