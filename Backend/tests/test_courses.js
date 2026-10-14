/**
 * test_courses.js — Automated test suite for the Courses module
 *
 * Verifies:
 *   1. Admin can't be self-registered; CRUD is admin-only (403 for candidates)
 *   2. CRUD: create (201), Joi validation (400), duplicate title (409), list/filter,
 *      get, patch, delete (204 → 404)
 *   3. GET /courses/recommend/:interviewId
 *      - exact skillTag match (case/punctuation-insensitive), cheaper first
 *      - semantic fallback for gaps without an exact match (GEMINI_MOCK matcher)
 *      - top 5 cap with round-robin across gaps, "why" line on every item
 *      - unmatched gaps reported; 409 for unfinished interviews; owner/staff access
 *      - real Gemini path failing → exact matches only, still 200
 *   4. POST /courses/:id/checkout returns a mock payment session in minor units
 *
 * Needs PostgreSQL only (MongoDB is not used by this module).
 */

import 'dotenv/config';
import axios from 'axios';
import app from '../src/app.js';
import config from '../src/config/env.js';
import { sequelize, User, Interview, Course } from '../src/models/index.js';

const colors = { green: '\x1b[32m', red: '\x1b[31m', cyan: '\x1b[36m', yellow: '\x1b[33m', reset: '\x1b[0m', bold: '\x1b[1m' };
const logPass = (name) => console.log(`  ${colors.green}✔ PASS:${colors.reset} ${name}`);
const logFail = (name, err) => console.error(`  ${colors.red}✖ FAIL:${colors.reset} ${name}\n     ${err.message || err}`);
const logSection = (name) => console.log(`\n${colors.bold}${colors.cyan}▶ ${name}${colors.reset}`);

async function runTests() {
    console.log(`${colors.bold}${colors.yellow}=====================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.yellow}   AI ATS — Courses Module Test Suite                ${colors.reset}`);
    console.log(`${colors.bold}${colors.yellow}=====================================================${colors.reset}`);

    await sequelize.authenticate();
    // Apply new columns (courses.currency, interview report fields) — dev server does the same on boot
    await Course.sync({ alter: true });
    await Interview.sync({ alter: true });

    config.geminiMock = true;
    const server = app.listen(0);
    const client = axios.create({ baseURL: `http://127.0.0.1:${server.address().port}`, validateStatus: () => true });
    const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

    const ts = Date.now();
    const password = 'Password123!';
    const emails = {
        ada: `crs_ada_${ts}@example.com`,
        eve: `crs_eve_${ts}@example.com`,
        bob: `crs_bob_${ts}@example.com`,
        admin: `crs_admin_${ts}@example.com`,
    };
    const createdCourseIds = [];

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
        logSection('0. Setup');
        const selfAdmin = await client.post('/auth/register', { name: 'Mallory', email: `crs_mal_${ts}@example.com`, password, role: 'admin' });
        assert(selfAdmin.status === 400, 'Self-registering as admin is rejected (400)');

        const tokens = {};
        const ids = {};
        for (const [key, role] of [['ada', 'candidate'], ['eve', 'candidate'], ['bob', 'recruiter']]) {
            const res = await client.post('/auth/register', { name: key, email: emails[key], password, role });
            assert(res.status === 201, `Registers ${role} ${key}`);
            tokens[key] = res.data.token;
            ids[key] = (await User.findOne({ where: { email: emails[key] } })).id;
        }
        await User.create({ name: 'Admin', email: emails.admin, passwordHash: password, role: 'admin' }); // what create:admin does
        const adminLogin = await client.post('/auth/login', { email: emails.admin, password });
        assert(adminLogin.status === 200 && adminLogin.data.token, 'Admin (created via script path) can log in');
        tokens.admin = adminLogin.data.token;

        // ── 1. CRUD ──────────────────────────────────────────────────────────
        logSection('1. Course CRUD (admin only)');
        const course = (title, skillTag, price, extra = {}) => ({
            title: `${title} ${ts}`, skillTag, price, url: 'https://example.com/course', description: `${title} course`, ...extra,
        });

        assert((await client.post('/api/courses', course('Hack', 'Hacking', 10), auth(tokens.ada))).status === 403, 'Candidate cannot create a course → 403');
        assert((await client.post('/api/courses', course('Hack', 'Hacking', 10), auth(tokens.bob))).status === 403, 'Recruiter cannot create a course → 403');
        assert((await client.post('/api/courses', course('Bad URL', 'X', 10, { url: 'not a url' }), auth(tokens.admin))).status === 400, 'Invalid url → 400');
        assert((await client.post('/api/courses', course('Neg', 'X', -5), auth(tokens.admin))).status === 400, 'Negative price → 400');

        // Catalog for recommendations (tags are unique to this run so seed data can't interfere)
        const catalog = [
            course('Rust Mid', `Rust${ts}`, 30),
            course('Rust Cheap', `Rust${ts}`, 10),
            course('Rust Plus', `Rust${ts}`, 20),
            course('Rust Pro', `Rust${ts}`, 40),
            course('Go Basics', `Go-Lang ${ts}`, 15, { currency: 'inr' }),
            course('Design Systems', `Design${ts} Systems`, 25),
            course('Free Intro', `Freebie${ts}`, 0),
        ];
        const byTitle = {};
        for (const c of catalog) {
            const res = await client.post('/api/courses', c, auth(tokens.admin));
            assert(res.status === 201, `Admin creates "${c.title}"`);
            createdCourseIds.push(res.data.data.id);
            byTitle[c.title.replace(` ${ts}`, '')] = res.data.data;
        }
        assert(typeof byTitle['Rust Mid'].price === 'number', 'price is returned as a number');
        assert(byTitle['Go Basics'].currency === 'INR', 'currency is normalised to upper case');

        const dup = await client.post('/api/courses', catalog[0], auth(tokens.admin));
        assert(dup.status === 409, `Duplicate title → 409 (got ${dup.status})`);

        const list = await client.get(`/api/courses?skillTag=rust${ts}`, auth(tokens.ada));
        assert(list.status === 200 && list.data.data.total === 4, 'List filters by skillTag (case-insensitive)');
        assert(list.data.data.items[0].price === 10, 'List is ordered cheapest first within a tag');

        const one = await client.get(`/api/courses/${byTitle['Go Basics'].id}`, auth(tokens.ada));
        assert(one.status === 200 && one.data.data.title === `Go Basics ${ts}`, 'GET /courses/:id');

        const patch = await client.patch(`/api/courses/${byTitle['Rust Pro'].id}`, { price: 45.5 }, auth(tokens.admin));
        assert(patch.status === 200 && patch.data.data.price === 45.5, 'Admin PATCH updates price');
        assert((await client.patch(`/api/courses/${byTitle['Rust Pro'].id}`, {}, auth(tokens.admin))).status === 400, 'Empty PATCH → 400');
        assert((await client.patch(`/api/courses/${byTitle['Rust Pro'].id}`, { price: 1 }, auth(tokens.ada))).status === 403, 'Candidate PATCH → 403');

        const tmp = await client.post('/api/courses', course('Temp', 'Tmp', 5), auth(tokens.admin));
        createdCourseIds.push(tmp.data.data.id);
        assert((await client.delete(`/api/courses/${tmp.data.data.id}`, auth(tokens.ada))).status === 403, 'Candidate DELETE → 403');
        assert((await client.delete(`/api/courses/${tmp.data.data.id}`, auth(tokens.admin))).status === 204, 'Admin DELETE → 204');
        assert((await client.get(`/api/courses/${tmp.data.data.id}`, auth(tokens.ada))).status === 404, 'Deleted course → 404');

        // ── 2. Recommendations ───────────────────────────────────────────────
        logSection('2. GET /courses/recommend/:interviewId');
        const skillGaps = [`rust${ts}`, `golang${ts}`, `Distributed Design${ts}`, `Underwater${ts} Basketry`];
        const done = await Interview.create({ userId: ids.ada, status: 'completed', questions: [], score: 61, skillGaps, completedAt: new Date() });
        const ongoing = await Interview.create({ userId: ids.ada, status: 'ongoing', questions: [] });

        assert((await client.get(`/api/courses/recommend/${ongoing.id}`, auth(tokens.ada))).status === 409, 'Unfinished interview → 409');
        assert((await client.get(`/api/courses/recommend/${done.id}`, auth(tokens.eve))).status === 403, "Another candidate's interview → 403");
        assert((await client.get('/api/courses/recommend/not-a-uuid', auth(tokens.ada))).status === 400, 'Invalid interviewId → 400');

        const rec = await client.get(`/api/courses/recommend/${done.id}`, auth(tokens.ada));
        assert(rec.status === 200, 'Owner gets recommendations → 200');
        const r = rec.data.data;
        const titles = r.recommendations.map((x) => x.course.title.replace(` ${ts}`, ''));
        console.log(`     picked: ${titles.join(' | ')}`);
        assert(r.recommendations.length === 5, 'Returns the top 5');
        assert(titles[0] === 'Rust Cheap' && r.recommendations[0].matchType === 'exact', 'Exact match ("rust" ↔ "Rust"), cheapest course first');
        assert(titles[1] === 'Go Basics' && r.recommendations[1].matchType === 'exact', 'Exact match ignores punctuation/case ("golang" ↔ "Go-Lang")');
        assert(titles[2] === 'Design Systems' && r.recommendations[2].matchType === 'semantic', 'Semantic fallback matches "Distributed Design" → "Design Systems"');
        assert(titles[3] === 'Rust Plus' && titles[4] === 'Rust Mid', 'Round-robin across gaps before taking more courses for one gap');
        assert(r.recommendations.every((x) => typeof x.why === 'string' && x.why.length > 10), 'Every recommendation has a "why recommended" line');
        assert(JSON.stringify(r.unmatchedGaps) === JSON.stringify([`Underwater${ts} Basketry`]), 'Gaps with no relevant course are reported as unmatched');
        assert(r.semanticMatching === 'mock', 'semanticMatching reports which path ran');

        const staffRec = await client.get(`/api/courses/recommend/${done.id}`, auth(tokens.bob));
        assert(staffRec.status === 200, 'Recruiter can view recommendations for any interview');

        const savedKey = config.geminiApiKey;
        config.geminiMock = false;
        config.geminiApiKey = 'invalid-key-for-courses-test';
        try {
            const degraded = await client.get(`/api/courses/recommend/${done.id}`, auth(tokens.ada));
            assert(degraded.status === 200 && degraded.data.data.semanticMatching === 'unavailable', 'Gemini failure degrades to exact matches only (still 200)');
            assert(degraded.data.data.recommendations.every((x) => x.matchType === 'exact'), 'No semantic items when Gemini is unavailable');
        } finally {
            config.geminiApiKey = savedKey;
            config.geminiMock = true;
        }

        // ── 3. Checkout ──────────────────────────────────────────────────────
        logSection('3. POST /courses/:id/checkout (mock provider)');
        assert((await client.post(`/api/courses/${byTitle['Rust Mid'].id}/checkout`)).status === 401, 'Checkout without login → 401');
        assert((await client.post(`/api/courses/${byTitle['Free Intro'].id}/checkout`, {}, auth(tokens.ada))).status === 400, 'Free course → 400');
        assert((await client.post('/api/courses/11111111-1111-4111-8111-111111111111/checkout', {}, auth(tokens.ada))).status === 404, 'Unknown course → 404');

        const co = await client.post(`/api/courses/${byTitle['Go Basics'].id}/checkout`, {}, auth(tokens.ada));
        assert(co.status === 201, 'Checkout → 201');
        const s = co.data.data;
        assert(s.provider === 'mock' && s.status === 'created', 'Session comes from the mock provider');
        assert(s.amount === 1500 && s.currency === 'INR', 'Amount is in minor units (15.00 INR → 1500)');
        assert(/^order_[a-f0-9]{20}$/.test(s.orderId) && s.providerOrderId.startsWith('mock_'), 'Has our orderId and a provider order id');
        assert(s.paymentLink.startsWith(`${config.clientUrl}/checkout/mock?`) && s.paymentLink.includes(byTitle['Go Basics'].id), 'Returns a mock payment link');
        assert(new Date(s.expiresAt) > new Date(), 'Session has a future expiry');

        console.log(`\n${colors.bold}${colors.green}=====================================================${colors.reset}`);
        console.log(`${colors.bold}${colors.green}   ALL TESTS PASSED: ${passed}/${total} tests successful!          ${colors.reset}`);
        console.log(`${colors.bold}${colors.green}=====================================================${colors.reset}\n`);
    } catch (err) {
        console.error(`\n${colors.red}${colors.bold}Test Suite Failed:${colors.reset}`, err.message);
        process.exitCode = 1;
    } finally {
        try {
            await Course.destroy({ where: { id: createdCourseIds } });
            const users = await User.findAll({ where: { email: [...Object.values(emails), `crs_mal_${ts}@example.com`] } });
            const userIds = users.map((u) => u.id);
            if (userIds.length) {
                await Interview.destroy({ where: { userId: userIds } });
                await User.destroy({ where: { id: userIds } });
            }
            console.log('🧹  Cleanup complete (test users, courses and interviews removed)');
        } catch (err) {
            console.error('Cleanup failed:', err.message);
        }
        server.close();
        await sequelize.close();
    }
}

runTests();
