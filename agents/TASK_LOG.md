# Task Log

Living status of the project. **Agents: update this file when you finish a task.**
Put the newest entries at the top of "Changelog" and keep entries short.

## Status board

### Done
- [x] Express app skeleton: helmet, cors, rate limiting, morgan, global error handler
- [x] Config: `env.js`, Sequelize (`database.js`), Mongoose (`mongo.js`), `.env.example`
- [x] `users` module: register/login, JWT access + refresh cookie, bcrypt, roles, candidate profile, README
- [x] `resume` module: upload (multer), pdf/docx extraction, Gemini parsing, storage service, README
- [x] `interview` module: start / answer / complete / get, Gemini AI helper, Mongo transcript, README
- [x] Course model + seeder
- [x] Frontend pages, api clients, auth store, `useSpeech` hook
- [x] Removed legacy files (old `modules/auth`, CJS `postgres.js`, MySQL `config.json`, duplicate tests)

### Pending
- [ ] `courses` module: routes, controller, service, validation, README. Mount `/api/courses`
- [ ] `interview.validation.js` with Joi schemas for start / answer / complete. Add `validate` to the routes
- [ ] Recommend courses from Feedback skill gaps
- [ ] Recruiter features from root README: manage candidates, schedule interviews, leave feedback
- [ ] `Frontend/.env.example` (`VITE_API_URL`)
- [ ] Use `socket.io-client` on the frontend, or remove it (it is installed but unused)
- [ ] `useInterviewStore` (Zustand) for interview session state
- [ ] Tests: `test_interview.js`, `test_courses.js`
- [ ] Review the `GEMINI_MODEL` default (`gemini-1.5-flash`) against currently available models
- [ ] Decide what to do with the `ATSAPIAI` gitlink (a separate Python repo tracked with no `.gitmodules`)

## Changelog
- **2026-10-14**: Removed legacy/unused files. Added the `agents/` guide files and `docs/tech-stack/`.
