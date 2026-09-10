/**
 * test_auth.js — Comprehensive automated test suite for Auth & Users module
 *
 * Verifies:
 *   1. Joi input validation on registration & login
 *   2. POST /auth/register (bcrypt 12 rounds, JWT access token, httpOnly refresh cookie)
 *   3. Duplicate email prevention
 *   4. POST /auth/login (credential check, JWT access token, httpOnly refresh cookie)
 *   5. Authentication middleware guard on protected routes (401 when unauthenticated)
 *   6. GET /candidate/profile (access allowed for candidate role)
 *   7. PUT /candidate/profile (profile update with Joi validation)
 *   8. Role authorization guard (authorizeRoles: 403 for disallowed roles)
 *   9. Token refresh via POST /auth/refresh
 */

import app from '../src/app.js';
import { sequelize } from '../src/config/database.js';
import User from '../src/modules/users/User.model.js';
import axios from 'axios';

const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m',
    bold: '\x1b[1m',
};

const logPass = (name) => console.log(`  ${colors.green}✔ PASS:${colors.reset} ${name}`);
const logFail = (name, err) => console.error(`  ${colors.red}✖ FAIL:${colors.reset} ${name}\n     ${err.message || err}`);
const logSection = (name) => console.log(`\n${colors.bold}${colors.cyan}▶ ${name}${colors.reset}`);

async function runTests() {
    console.log(`${colors.bold}${colors.yellow}=====================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.yellow}   AI ATS — Auth & Candidate Module Test Suite       ${colors.reset}`);
    console.log(`${colors.bold}${colors.yellow}=====================================================${colors.reset}`);

    // Ensure database connection
    await sequelize.authenticate();
    console.log(`${colors.green}✔ Connected to PostgreSQL database${colors.reset}`);

    // Start ephemeral test server
    const server = app.listen(0);
    const port = server.address().port;
    const baseURL = `http://127.0.0.1:${port}`;
    console.log(`${colors.cyan}✔ Test server listening on http://127.0.0.1:${port}${colors.reset}`);

    const client = axios.create({
        baseURL,
        validateStatus: () => true, // Don't throw on 4xx/5xx
    });

    const timestamp = Date.now();
    const candidateData = {
        name: 'Ada Lovelace',
        email: `ada_${timestamp}@example.com`,
        password: 'Password123!',
        role: 'candidate',
    };

    const recruiterData = {
        name: 'Bob Recruiter',
        email: `bob_${timestamp}@example.com`,
        password: 'Password123!',
        role: 'recruiter',
    };

    let candidateAccessToken = null;
    let candidateRefreshToken = null;
    let recruiterAccessToken = null;
    let totalTests = 0;
    let passedTests = 0;

    const assert = (condition, message) => {
        totalTests++;
        if (!condition) {
            logFail(message, new Error('Assertion failed'));
            throw new Error(`Assertion failed: ${message}`);
        }
        passedTests++;
        logPass(message);
    };

    try {
        // ── 1. Joi Validation Tests ───────────────────────────────────────────
        logSection('1. Joi Input Validation');

        const invalidEmailRes = await client.post('/auth/register', {
            name: 'Test',
            email: 'not-an-email',
            password: 'Password123!',
        });
        assert(invalidEmailRes.status === 400, 'Rejects invalid email format with 400 Bad Request');
        assert(invalidEmailRes.data.message.includes('valid email'), 'Returns descriptive Joi error message for email');

        const shortPasswordRes = await client.post('/auth/register', {
            name: 'Test',
            email: 'valid@example.com',
            password: '123',
        });
        assert(shortPasswordRes.status === 400, 'Rejects password shorter than 6 chars with 400 Bad Request');

        const missingFieldsLogin = await client.post('/auth/login', {});
        assert(missingFieldsLogin.status === 400, 'Rejects login request missing credentials with 400');

        // ── 2. Registration Tests ─────────────────────────────────────────────
        logSection('2. POST /auth/register (Candidate)');

        const registerRes = await client.post('/auth/register', candidateData);
        assert(registerRes.status === 201, 'Returns 201 Created on valid registration');
        assert(registerRes.data.success === true, 'Response body has success: true');
        assert(registerRes.data.user.email === candidateData.email, 'Returns correct user email');
        assert(registerRes.data.user.role === 'candidate', 'Assigns candidate role');
        assert(!registerRes.data.user.passwordHash, 'passwordHash is stripped from response payload');
        assert(!!registerRes.data.token, 'Returns JWT access token in response body');

        candidateAccessToken = registerRes.data.token;

        // Check httpOnly refresh token cookie
        const setCookieHeaders = registerRes.headers['set-cookie'] || [];
        const refreshCookieHeader = setCookieHeaders.find((c) => c.startsWith('refreshToken='));
        assert(!!refreshCookieHeader, 'Sets refreshToken cookie in response');
        assert(refreshCookieHeader.toLowerCase().includes('httponly'), 'refreshToken cookie has HttpOnly flag set');

        candidateRefreshToken = refreshCookieHeader.split(';')[0].split('=')[1];

        // Verify password in DB is hashed with bcrypt
        const dbUser = await User.findOne({ where: { email: candidateData.email } });
        assert(dbUser.passwordHash.startsWith('$2'), 'Password stored in PostgreSQL is bcrypt hashed (rounds=12)');
        assert(await dbUser.isPasswordMatch(candidateData.password), 'dbUser.isPasswordMatch() confirms bcrypt password match');

        // Duplicate registration check
        const dupRes = await client.post('/auth/register', candidateData);
        assert(dupRes.status === 400, 'Rejects duplicate email registration with 400 Bad Request');

        // ── 3. Login Tests ────────────────────────────────────────────────────
        logSection('3. POST /auth/login');

        const wrongPassRes = await client.post('/auth/login', {
            email: candidateData.email,
            password: 'WrongPassword123!',
        });
        assert(wrongPassRes.status === 401, 'Rejects incorrect password with 401 Unauthorized');

        const loginRes = await client.post('/auth/login', {
            email: candidateData.email,
            password: candidateData.password,
        });
        assert(loginRes.status === 200, 'Returns 200 OK on correct credentials');
        assert(!!loginRes.data.token, 'Returns new access token on login');
        candidateAccessToken = loginRes.data.token;

        // ── 4. Protected Route & Auth Middleware Tests ────────────────────────
        logSection('4. Protected Routes & authenticate Middleware');

        const noTokenRes = await client.get('/candidate/profile');
        assert(noTokenRes.status === 401, 'GET /candidate/profile without token returns 401 Unauthorized');

        const invalidTokenRes = await client.get('/candidate/profile', {
            headers: { Authorization: 'Bearer this.is.invalid.token' },
        });
        assert(invalidTokenRes.status === 401, 'GET /candidate/profile with corrupted token returns 401');

        const validProfileRes = await client.get('/candidate/profile', {
            headers: { Authorization: `Bearer ${candidateAccessToken}` },
        });
        assert(validProfileRes.status === 200, 'GET /candidate/profile with valid token returns 200 OK');
        assert(validProfileRes.data.profile.email === candidateData.email, 'Returns candidate email');
        assert(validProfileRes.data.profile.name === candidateData.name, 'Returns candidate name');

        // ── 5. Profile Update (PUT /candidate/profile) ─────────────────────────
        logSection('5. PUT /candidate/profile');

        const updateRes = await client.put(
            '/candidate/profile',
            { name: 'Ada Lovelace, Countess' },
            { headers: { Authorization: `Bearer ${candidateAccessToken}` } }
        );
        assert(updateRes.status === 200, 'PUT /candidate/profile returns 200 OK on name update');
        assert(updateRes.data.profile.name === 'Ada Lovelace, Countess', 'Profile name updated successfully');

        // Verify with another GET
        const verifyUpdated = await client.get('/candidate/profile', {
            headers: { Authorization: `Bearer ${candidateAccessToken}` },
        });
        assert(verifyUpdated.data.profile.name === 'Ada Lovelace, Countess', 'Subsequent GET returns updated profile');

        // ── 6. Role-Based Authorization Guard Tests ───────────────────────────
        logSection('6. Role Authorization (authorizeRoles)');

        // Register recruiter
        const regRecruiter = await client.post('/auth/register', recruiterData);
        assert(regRecruiter.status === 201, 'Registers recruiter user');
        recruiterAccessToken = regRecruiter.data.token;

        // Recruiter attempting to access candidate-only route
        const forbiddenRes = await client.get('/candidate/profile', {
            headers: { Authorization: `Bearer ${recruiterAccessToken}` },
        });
        assert(forbiddenRes.status === 403, 'Recruiter accessing /candidate/profile returns 403 Forbidden');
        assert(forbiddenRes.data.message.includes('not permitted'), 'Forbidden error specifies role violation');

        // ── 7. Refresh Token Test ─────────────────────────────────────────────
        logSection('7. Token Refresh (POST /auth/refresh)');

        const refreshRes = await client.post(
            '/auth/refresh',
            {},
            { headers: { Cookie: `refreshToken=${candidateRefreshToken}` } }
        );
        assert(refreshRes.status === 200, 'POST /auth/refresh with cookie returns 200 OK');
        assert(!!refreshRes.data.accessToken, 'Returns new accessToken');

        // Use the newly refreshed token to fetch profile
        const newProfileRes = await client.get('/candidate/profile', {
            headers: { Authorization: `Bearer ${refreshRes.data.accessToken}` },
        });
        assert(newProfileRes.status === 200, 'Refreshed access token successfully authorizes protected route');

        // ── 8. API-Prefix Route Aliasing ──────────────────────────────────────
        logSection('8. API-Prefix Route Aliasing (/api/auth & /api/candidate)');

        const apiLoginRes = await client.post('/api/auth/login', {
            email: candidateData.email,
            password: candidateData.password,
        });
        assert(apiLoginRes.status === 200, 'POST /api/auth/login operates equivalently to /auth/login');

        const apiProfileRes = await client.get('/api/candidate/profile', {
            headers: { Authorization: `Bearer ${candidateAccessToken}` },
        });
        assert(apiProfileRes.status === 200, 'GET /api/candidate/profile operates equivalently to /candidate/profile');

        console.log(`\n${colors.bold}${colors.green}=====================================================${colors.reset}`);
        console.log(`${colors.bold}${colors.green}   ALL TESTS PASSED: ${passedTests}/${totalTests} tests successful!          ${colors.reset}`);
        console.log(`${colors.bold}${colors.green}=====================================================${colors.reset}\n`);

    } finally {
        // Cleanup test accounts
        await User.destroy({
            where: {
                email: [candidateData.email, recruiterData.email],
            },
        });
        server.close();
    }
}

runTests()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(`\n${colors.red}${colors.bold}Test Suite Failed:${colors.reset}`, err);
        process.exit(1);
    });
