/**
 * test_resume.js — Automated test suite for the Resume module
 *
 * Verifies:
 *   1. Authentication guard (401 without token)
 *   2. File-type guard (400 for non-PDF/DOCX)
 *   3. Size guard (413 for files over 5 MB)
 *   4. POST /resume/upload happy path (mock Gemini): 201 + strict parsed JSON
 *   5. GET /resume/:id (owner) returns the persisted parsedJson
 *   6. Uploaded file downloads only via the authenticated /:id/file route (no public /uploads)
 *   7. Ownership guard (403 for another candidate, 200 for recruiter)
 *   8. GET /resume/:id with unknown UUID → 404
 *   9. GET /resume/my lists the user's resumes
 *  10. LLM failure path: invalid key → fast, clear 502 (no mock, no silent fallback, no leaked provider details)
 *  11. Parsed-JSON validation: nulls / bad email / long strings tolerated; wrong types & unknown seniority rejected
 *
 * Gemini runs in GEMINI_MOCK mode for sections 1–9 (deterministic, offline);
 * section 10 temporarily flips the config to exercise the real retry loop.
 */

import app from '../src/app.js';
import config from '../src/config/env.js';
import { sequelize } from '../src/config/database.js';
import User from '../src/modules/users/User.model.js';
import Resume from '../src/modules/resume/resume.model.pg.js';
import storage from '../src/services/storage/index.js';
import { validateParsedResume } from '../src/modules/resume/resume.validation.js';
import axios from 'axios';
import fs from 'node:fs/promises';

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

// ── Sample resume PDF builder (zero dependencies) ────────────────────────────
/**
 * Builds a valid single-page PDF (PDF 1.4, Helvetica) containing the given
 * lines. Pure ASCII content keeps byte offsets == string indices.
 */
const escapePdfText = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const buildResumePdf = (lines, { padBytes = 0 } = {}) => {
    const contentOps = ['BT', '/F1 11 Tf', '50 760 Td', '14 TL'];
    lines.forEach((line, i) => {
        if (i > 0) contentOps.push('T*');
        contentOps.push(`(${escapePdfText(line)}) Tj`);
    });
    contentOps.push('ET');
    const stream = contentOps.join('\n');

    const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [];
    objects.forEach((body, i) => {
        offsets.push(pdf.length);
        pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
    });

    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.forEach((off) => {
        pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

    const buf = Buffer.from(pdf, 'latin1');
    if (padBytes > buf.length) {
        // Oversize test only — multer rejects on size before any parsing happens
        return Buffer.concat([buf, Buffer.alloc(padBytes - buf.length, 0x20)]);
    }
    return buf;
};

const SAMPLE_RESUME_LINES = [
    'AARAV SHARMA',
    'Bengaluru, India | aarav.sharma@example.com | +91 98765 43210',
    'SUMMARY',
    'Full-stack engineer with 3.5 years of experience building web applications',
    'with React, Node.js and PostgreSQL. Strong ownership of REST APIs.',
    'SKILLS',
    'JavaScript, TypeScript, React, Redux, Node.js, Express, PostgreSQL, MongoDB, Docker, AWS',
    'EXPERIENCE',
    'Software Engineer, Finlytics Pvt Ltd (2022-07 - Present)',
    '- Built REST APIs with Node.js and Express serving 50k daily users',
    '- Migrated legacy React components to TypeScript, cutting runtime errors by 30%',
    'Junior Developer, WebNest Solutions (2021-01 - 2022-06)',
    '- Developed responsive UI with React and Tailwind CSS',
    'EDUCATION',
    'B.Tech in Computer Science, VTU Bengaluru, 2020',
    'PROJECTS',
    'HireFlow - ATS resume screening tool built with the MERN stack',
    'CropSense - ML-powered crop advisory progressive web app',
];

/** Attach a Buffer to multipart/form-data as field `resume` */
const fileForm = (buffer, filename, mimeType) => {
    const form = new FormData();
    form.append('resume', new Blob([buffer], { type: mimeType }), filename);
    return form;
};

// (test flow appended below)

async function runTests() {
    console.log(`${colors.bold}${colors.yellow}=====================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.yellow}   AI ATS — Resume Module Test Suite                 ${colors.reset}`);
    console.log(`${colors.bold}${colors.yellow}=====================================================${colors.reset}`);

    // Ensure database connection
    await sequelize.authenticate();
    console.log(`${colors.green}✔ Connected to PostgreSQL database${colors.reset}`);
    // Apply new Resume columns (e.g. file_key) — the dev server does the same via sync({ alter: true })
    await Resume.sync({ alter: true });

    // Start ephemeral test server
    const server = app.listen(0);
    const port = server.address().port;
    const baseURL = `http://127.0.0.1:${port}`;
    console.log(`${colors.cyan}✔ Test server listening on http://127.0.0.1:${port}${colors.reset}`);

    const client = axios.create({
        baseURL,
        validateStatus: () => true, // Don't throw on 4xx/5xx
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
    });

    const timestamp = Date.now();
    const candidateData = { name: 'Ada Lovelace', email: `ada_${timestamp}@example.com`, password: 'Password123!', role: 'candidate' };
    const candidate2Data = { name: 'Eve Candidate', email: `eve_${timestamp}@example.com`, password: 'Password123!', role: 'candidate' };
    const recruiterData = { name: 'Bob Recruiter', email: `bob_${timestamp}@example.com`, password: 'Password123!', role: 'recruiter' };

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

    // Remember what we uploaded so cleanup can remove DB rows AND stored files
    const auth = (token) => ({ Authorization: `Bearer ${token}` });

    try {
        // ── Setup: register users ────────────────────────────────────────────
        logSection('0. Setup — register test users');
        const reg1 = await client.post('/auth/register', candidateData);
        assert(reg1.status === 201, 'Registers candidate #1 (resume owner)');
        const candidateToken = reg1.data.token;

        const reg2 = await client.post('/auth/register', candidate2Data);
        assert(reg2.status === 201, 'Registers candidate #2 (ownership test)');
        const candidate2Token = reg2.data.token;

        const reg3 = await client.post('/auth/register', recruiterData);
        assert(reg3.status === 201, 'Registers recruiter');
        const recruiterToken = reg3.data.token;

        // ── 1. Authentication guard ──────────────────────────────────────────
        logSection('1. Authentication guard');
        const noAuthRes = await client.post('/api/resume/upload', fileForm(buildResumePdf(SAMPLE_RESUME_LINES), 'resume.pdf', 'application/pdf'));
        assert(noAuthRes.status === 401, 'POST /resume/upload without token returns 401 Unauthorized');

        // ── 2. File-type guard ───────────────────────────────────────────────
        logSection('2. File-type guard (PDF/DOCX only)');
        const txtRes = await client.post(
            '/api/resume/upload',
            fileForm(Buffer.from('this is not a resume, just a plain text file'), 'notes.txt', 'text/plain'),
            { headers: auth(candidateToken) }
        );
        assert(txtRes.status === 400, 'Upload of a .txt file is rejected with 400');
        assert(/pdf or docx/i.test(txtRes.data.message || ''), `Error message explains the allowed types (got: "${txtRes.data.message}")`);

        // ── 3. Size guard (5 MB) ─────────────────────────────────────────────
        logSection('3. Size guard (MAX_FILE_SIZE = 5 MB)');
        const bigPdf = buildResumePdf(SAMPLE_RESUME_LINES, { padBytes: 6 * 1024 * 1024 });
        const bigRes = await client.post(
            '/api/resume/upload',
            fileForm(bigPdf, 'big_resume.pdf', 'application/pdf'),
            { headers: auth(candidateToken) }
        );
        assert(bigRes.status === 413, 'Upload larger than 5 MB is rejected with 413 Payload Too Large');
        assert(/too large/i.test(bigRes.data.message || ''), 'Error message clearly states the size limit');

        // ── 4. Happy path: upload → parse (mock) → persist ───────────────────
        logSection('4. POST /api/resume/upload (happy path, GEMINI_MOCK)');
        const pdfBuffer = buildResumePdf(SAMPLE_RESUME_LINES);
        const uploadRes = await client.post(
            '/api/resume/upload',
            fileForm(pdfBuffer, 'sample_resume.pdf', 'application/pdf'),
            { headers: auth(candidateToken) }
        );
        assert(uploadRes.status === 201, 'Valid PDF upload returns 201 Created');
        assert(uploadRes.data.success === true, 'Response body has success: true');

        const uploadData = uploadRes.data.data;
        assert(!!uploadData?.id, 'Returns the new resume id');
        assert(uploadData.fileUrl === `/api/resume/${uploadData.id}/file`, `fileUrl is the authenticated download route (${uploadData.fileUrl})`);

        const structured = uploadData.structured;
        assert(structured && typeof structured === 'object', 'Returns structured parsed JSON');
        assert(structured.name === 'Aarav Sharma', 'structured.name parsed correctly');
        assert(structured.email === 'aarav.sharma@example.com', 'structured.email parsed correctly');
        assert(Array.isArray(structured.skills) && structured.skills.length > 0, `structured.skills is a non-empty array (${structured.skills.length} skills)`);
        assert(Array.isArray(structured.experience) && structured.experience.length > 0, 'structured.experience is a non-empty array');
        assert(Array.isArray(structured.education) && structured.education.length > 0, 'structured.education is a non-empty array');
        assert(Array.isArray(structured.projects) && structured.projects.length > 0, 'structured.projects is a non-empty array');
        assert(typeof structured.experienceYears === 'number' && structured.experienceYears >= 0, `structured.experienceYears is a number (${structured.experienceYears})`);
        assert(typeof structured.seniorityLevel === 'string' && structured.seniorityLevel.length > 0, `structured.seniorityLevel present (${structured.seniorityLevel})`);

        const resumeId = uploadData.id;

        // ── 5. GET /:id + file serving + GET /my ─────────────────────────────
        logSection('5. GET /api/resume/:id, authenticated file download, GET /my');
        const getRes = await client.get(`/api/resume/${resumeId}`, { headers: auth(candidateToken) });
        assert(getRes.status === 200, 'GET /resume/:id as owner returns 200');
        assert(getRes.data.data.id === resumeId, 'GET returns the requested resume id');
        assert(getRes.data.data.parsedJson?.name === 'Aarav Sharma', 'Persisted parsedJson matches the upload response');
        assert(getRes.data.data.fileUrl === uploadData.fileUrl, 'Persisted fileUrl matches the upload response');

        assert(!('fileKey' in getRes.data.data), 'Internal storage key (fileKey) is not exposed in the API response');

        const binary = { responseType: 'arraybuffer' };
        const fileRes = await client.get(uploadData.fileUrl, { ...binary, headers: auth(candidateToken) });
        assert(fileRes.status === 200, `Owner can download the file from ${uploadData.fileUrl}`);
        assert(Buffer.from(fileRes.data).equals(pdfBuffer), 'Downloaded bytes match the uploaded PDF exactly');
        assert(fileRes.headers['content-type'] === 'application/pdf', 'Download has Content-Type application/pdf');
        assert(/attachment; filename="resume-[0-9a-f-]+\.pdf"/.test(fileRes.headers['content-disposition'] || ''), 'Download is sent as an attachment with a safe filename');
        assert(/no-store/.test(fileRes.headers['cache-control'] || ''), 'Download is marked Cache-Control: no-store');

        const anonFileRes = await client.get(uploadData.fileUrl, binary);
        assert(anonFileRes.status === 401, 'Download without a token returns 401');

        const { fileKey } = await Resume.findByPk(resumeId);
        const publicRes = await client.get(`/uploads/${fileKey}`, binary);
        assert(publicRes.status === 404, 'Stored file is NOT publicly reachable under /uploads');

        const myRes = await client.get('/api/resume/my', { headers: auth(candidateToken) });
        assert(myRes.status === 200 && myRes.data.count >= 1, `GET /resume/my lists ${myRes.data.count} resume(s) for the owner`);
        assert(myRes.data.data.some((r) => r.id === resumeId), 'GET /resume/my includes the uploaded resume');

        // ── 6. Ownership guard ───────────────────────────────────────────────
        logSection('6. Ownership guard on GET /:id and GET /:id/file');
        const forbiddenRes = await client.get(`/api/resume/${resumeId}`, { headers: auth(candidate2Token) });
        assert(forbiddenRes.status === 403, 'Another candidate gets 403 Forbidden for a foreign resume');

        const recruiterRes = await client.get(`/api/resume/${resumeId}`, { headers: auth(recruiterToken) });
        assert(recruiterRes.status === 200, 'Recruiter (staff role) may read any resume');

        const forbiddenFileRes = await client.get(`/api/resume/${resumeId}/file`, { responseType: 'arraybuffer', headers: auth(candidate2Token) });
        assert(forbiddenFileRes.status === 403, 'Another candidate gets 403 when downloading a foreign resume file');
        const recruiterFileRes = await client.get(`/api/resume/${resumeId}/file`, { responseType: 'arraybuffer', headers: auth(recruiterToken) });
        assert(recruiterFileRes.status === 200, 'Recruiter may download any resume file');

        // ── 7. Unknown id ────────────────────────────────────────────────────
        logSection('7. Unknown resume id');
        const notFoundRes = await client.get('/api/resume/11111111-1111-4111-8111-111111111111', { headers: auth(candidateToken) });
        assert(notFoundRes.status === 404, 'GET with a valid but unknown UUID returns 404 Not Found');

        // ── 8. LLM failure path: retries then clear 502 ──────────────────────
        logSection('8. LLM failure path (fail fast on bad key + clear error, no silent mock)');
        const savedMock = config.geminiMock;
        const savedKey = config.geminiApiKey;
        config.geminiMock = false;                          // force the real Gemini path
        config.geminiApiKey = 'invalid-key-for-retry-test'; // non-placeholder → passes the key guard

        try {
            const startedAt = Date.now();
            const failRes = await client.post(
                '/api/resume/upload',
                fileForm(buildResumePdf(SAMPLE_RESUME_LINES), 'fail_resume.pdf', 'application/pdf'),
                { headers: auth(candidateToken) }
            );
            const elapsedMs = Date.now() - startedAt;
            assert(failRes.status === 502, 'Upload fails with 502 when the AI provider rejects the key');
            assert(/misconfigured.*GEMINI_API_KEY/i.test(failRes.data.message || ''), `Clear, actionable error (got: "${failRes.data.message}")`);
            assert(!/googleapis|API_KEY_INVALID/.test(failRes.data.message || ''), 'Raw provider error details are not leaked to the client');
            assert(elapsedMs < 1500, `Permanent 4xx error is not retried with backoff (${elapsedMs} ms)`);
        } finally {
            config.geminiMock = savedMock;                  // restore
            config.geminiApiKey = savedKey;
        }

        // ── 9. Parsed-JSON validation tolerates messy-but-usable LLM output ──
        logSection('9. Parsed-JSON validation (nulls, bad email, long strings, seniority enum)');
        const baseParsed = {
            name: 'Priya Nair', email: 'priya@example.com', skills: ['React'], experience: [],
            education: [], projects: [], experienceYears: 4, seniorityLevel: 'Senior',
        };
        const nullCase = validateParsedResume({
            ...baseParsed,
            experience: [{ title: 'Engineer', company: null, startDate: '2020', endDate: null, description: null }],
        });
        assert(!nullCase.error && nullCase.value.experience[0].company === '', 'Nullable nested fields are coerced to "" (not a retry-triggering failure)');
        const emailCase = validateParsedResume({ ...baseParsed, email: 'priya at gmail dot com' });
        assert(!emailCase.error && emailCase.value.email === '', 'Unparseable email is blanked instead of failing the whole parse');
        const longSkill = 'x'.repeat(90);
        const longCase = validateParsedResume({ ...baseParsed, skills: [longSkill] });
        assert(!longCase.error && longCase.value.skills[0].length === 60, 'Over-long skill strings are truncated to 60 chars');
        const badLevel = validateParsedResume({ ...baseParsed, seniorityLevel: 'Wizard' });
        assert(Boolean(badLevel.error), 'Unknown seniorityLevel is rejected (triggers a retry)');
        const badType = validateParsedResume({ ...baseParsed, skills: 'React, Node' });
        assert(Boolean(badType.error), 'Structurally wrong output (skills as string) is rejected');

        console.log(`\n${colors.bold}${colors.green}=====================================================${colors.reset}`);
        console.log(`${colors.bold}${colors.green}   ALL TESTS PASSED: ${passedTests}/${totalTests} tests successful!          ${colors.reset}`);
        console.log(`${colors.bold}${colors.green}=====================================================${colors.reset}\n`);
    } catch (err) {
        console.error(`\n${colors.red}${colors.bold}Test Suite Failed:${colors.reset}`, err);
        server.close();
        process.exit(1);
    } finally {
        // ── Cleanup: DB rows + stored upload files ────────────────────────────
        try {
            const users = await User.findAll({
                where: { email: [candidateData.email, candidate2Data.email, recruiterData.email] },
            });
            const userIds = users.map((u) => u.id);

            if (userIds.length > 0) {
                const resumes = await Resume.findAll({ where: { userId: userIds } });
                for (const r of resumes) {
                    if (r.fileKey) {
                        await storage.deleteFile(r.fileKey).catch(() => {});
                    }
                }
                await Resume.destroy({ where: { userId: userIds } });
            }
            await User.destroy({ where: { id: userIds } });
            console.log('🧹  Cleanup complete (test users, resumes and files removed)');
        } catch (err) {
            console.warn('Cleanup warning:', err.message);
        }
        server.close();
    }
}

runTests()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error(`\n${colors.red}${colors.bold}Test Suite Failed:${colors.reset}`, err);
        process.exit(1);
    });



