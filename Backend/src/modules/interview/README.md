# Interview Module

This module runs a voice mock interview from a parsed resume. It saves every turn to MongoDB and stores the final evaluation in PostgreSQL.

```
create ──► Gemini (GEMINI_MODEL) → 8 planned questions (PG) ──► transcript opened (Mongo)
answer ──► save user turn ──► Gemini (GEMINI_FAST_MODEL, 5 s timeout) → follow-up | next question ──► save AI turn + latencyMs
finish ──► Gemini (GEMINI_MODEL) evaluates the full transcript → score, strengths, weaknesses, skillGaps (PG)
```

## Endpoints (all need `Authorization: Bearer <token>`)

| Method | Path | Who | Notes |
|--------|------|-----|-------|
| POST | `/api/interview/create` | resume owner | `{ resumeId, targetRole? }`. Returns `201 { id, targetRole, totalQuestions: 8, questionNumber: 1, question: { type, text } }` |
| POST | `/api/interview/:id/answer` | owner | `{ text }`. Returns `{ reply, kind: question\|follow_up\|closing, questionNumber, totalQuestions, done, latencyMs }` |
| POST | `/api/interview/:id/finish` | owner | Returns `{ score 0-100, summary, strengths[], weaknesses[], skillGaps[], skillBreakdown[{skill, score}] }`. Calling it again returns the same stored report |
| GET | `/api/interview/history` | owner / staff | `?limit=20&offset=0&status=ongoing\|completed`. Staff see every candidate and can filter with `&userId=` |
| GET | `/api/interview/:id` | owner / staff | Returns `{ interview, report, transcript }`. While the interview is running, candidates see only the questions asked so far |

Recruiters and admins can **read** any interview but can never answer or finish one.

## Reviewer feedback (recruiter / admin)
Human ratings, separate from the AI report. The code is in `feedback.{routes,controller,service,validation}.js` and the `Feedback` model.

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/feedback/add` | `{ interviewId, rating 1–5, comments? }`. Only for **completed** interviews (otherwise 409). There is one entry per reviewer per interview: sending again **updates** it (200), the first time returns 201 |
| GET | `/api/feedback/interview/:interviewId` | All reviewers' feedback, newest first, with reviewer names |

Reviewer feedback is **staff-only**; candidates never see recruiters' notes. When staff call `GET /api/interview/history`, each interview also includes its `feedbacks`.

## How a turn works
- **Question plan:** the 8 questions are 3 technical, 3 project-based and 2 behavioral, tailored to the resume. They are stored in `interviews.questions`. The prompt receives a resume summary **without name, email or phone**.
- **Follow-ups:** after each answer, the fast model either asks one follow-up (max 2 sentences) or moves on. The server allows **at most 1 follow-up per question**, so an interview has between 8 and 16 AI turns.
- **Moving on:** when the model moves on, its short acknowledgement is followed by the planned question word for word, so the plan can't drift.
- **Latency:** turns use `GEMINI_FAST_MODEL` with a 150-token output limit, the last 8 messages and a 5 s timeout, aiming for a 1.5–2 s reply. If the call times out or fails, the interview moves to the next planned question (`source: 'fallback'`) instead of stalling. Each AI turn's `latencyMs` is stored in Mongo and logged.
- **Double-submits:** a second request for the same interview while one is still running gets a 409.

## Failure behaviour
| Step | When Gemini fails |
|------|-------------------|
| create | 3 attempts with backoff, then a **502** with a clear message. Invalid key or model fails after one attempt |
| answer | Moves to the next planned question (`source: 'fallback'`); never errors |
| finish | 3 attempts, then **502**. The interview stays `ongoing`, so finish can be retried |
| MongoDB down | **503**. Turns are never kept only in memory |

There is no silent mock fallback, so a fake score can never reach a candidate. For offline development, set `GEMINI_MOCK=true` to get deterministic questions, turns and reports.

## Data
- **Postgres `interviews`:** `target_role`, `questions` (JSONB), `current_question_index`, `status`, `score`, `feedback_summary`, `strengths`, `weaknesses`, `skill_gaps`, `skill_breakdown`, `completed_at`.
- **Mongo `interview_chats`:** `{ interviewId, userId, messages[{ role, text, kind, questionIndex, latencyMs, source, timestamp }] }`.

## Environment
```env
GEMINI_MODEL=gemini-2.5-flash            # question generation + final evaluation
GEMINI_FAST_MODEL=gemini-2.5-flash-lite  # live turns (latency-critical)
GEMINI_MOCK=false
MONGO_URI=...                            # required: transcripts live in MongoDB
```

## Tests
```bash
MONGO_URI=mongodb://127.0.0.1:27017 npm run test:interview
```
The tests need Postgres and MongoDB and run with mocked Gemini. They cover access rules, validation, the follow-up limit, latency logging, the full run to finish, history, and the Gemini failure paths.
