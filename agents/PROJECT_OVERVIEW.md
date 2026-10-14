# Project Overview — AI ATS

## What it is
A web app where a **candidate uploads a resume**, the AI **parses** it, runs a **real-time voice mock
interview** based on it, **scores** the candidate, finds **skill gaps**, and **recommends paid courses**.
The root [README.md](../README.md) also describes a **recruiter portal** (manage candidates,
schedule interviews, review performance, leave feedback) and role-based access. Both roles are in scope.

Roles: `candidate`, `recruiter`, `admin`.

## Monorepo layout
The root README shows a generic `client/` + `server/` sketch. The **real** folders are `Frontend/` and
`Backend/`. Keep those names and do not rename them.

```
ATS/
├── README.md                 # product README (features, author)
├── agents/                   # AI-agent guidance (this folder)
├── docs/tech-stack/          # what we use and why
├── Backend/
│   ├── .env.example          # every env var, no real values
│   ├── server.js             # boot: models → Postgres → Mongo → HTTP + Socket.io
│   ├── seeders/seedCourses.js
│   ├── tests/                # node scripts: test_auth.js, test_resume.js
│   └── src/
│       ├── app.js            # Express app: helmet, cors, rate-limit, routes, error handler
│       ├── config/           # env.js (only place that reads process.env), database.js (Sequelize), mongo.js
│       ├── middleware/       # auth (authenticate/protect/authorizeRoles), role, validate (Joi), error (global handler)
│       ├── models/index.js   # Sequelize model registry + associations
│       ├── services/storage/ # file storage abstraction (local disk today; S3/Cloudinary later)
│       ├── utils/            # ApiError.js, catchAsync.js
│       └── modules/
│           ├── users/        # auth (JWT access + refresh cookie, bcrypt) + candidate profile
│           ├── resume/       # upload (multer) → text extract (pdf-parse/mammoth) → Gemini parse
│           ├── interview/    # question gen, answer eval, final report (Gemini) + Mongo transcript
│           └── courses/      # course catalogue + skill-gap recommendations
└── Frontend/
    └── src/
        ├── api/              # axios instance + one file per backend module
        ├── store/            # Zustand stores
        ├── hooks/            # useSpeech (SpeechRecognition + speechSynthesis)
        ├── components/       # layout/, chat/, ui/, animations/
        └── pages/            # Landing, Login, Register, Dashboard, ResumeUpload, Interview, Results, Courses, Admin
```

### Module file convention (Backend)
Each module in `src/modules/<name>/` has:
`<name>.routes.js`, `<name>.controller.js`, `<name>.service.js`, `<name>.validation.js`, `README.md`,
plus optional `<name>.ai.js` (Gemini prompts), `*.model.pg.js` (Sequelize) and `*.model.mongo.js` (Mongoose).

- **routes**: wire up the middleware (`protect`, `authorizeRoles`, `validate`) and point to the controller.
- **controller**: thin. It is wrapped in `catchAsync`, reads `req` and calls the service.
- **service**: business logic and DB access. It throws `ApiError` on failure.
- **validation**: Joi schemas consumed by `validate` middleware.

## Data split
| Store | Holds |
|-------|-------|
| PostgreSQL (Sequelize) | users, resumes (+ parsed JSON), interviews, feedback/scores, courses |
| MongoDB (Mongoose) | interview chat transcripts / conversation history (`InterviewChat`) |
| Local disk (`Backend/uploads/`) | uploaded resume files via `services/storage` |

## Request flow
`Frontend (axios + JWT)` → `app.js` → `routes` → `middleware` → `controller` → `service` → DB / Gemini
Errors bubble to `middleware/error.middleware.js`, which returns a JSON error response.

## Core user journey
1. Register / login → access token (memory) + refresh token (httpOnly cookie)
2. Upload resume → parsed JSON stored in Postgres
3. Start interview → Gemini generates questions from the resume
4. Browser speaks the question (speechSynthesis) and listens for the answer (SpeechRecognition) → `POST /api/interview/answer`
5. Complete → Gemini scores the answers and lists skill gaps → stored as Feedback
6. Results page → course recommendations matched to the skill gaps

## Mounted API prefixes
`/api/auth`, `/api/candidate`, `/api/users`, `/api/resume`, `/api/interview`. Auth and candidate
routes are also mounted without the `/api` prefix. `/api/courses` is pending (see TASK_LOG).
The full endpoint list is in [docs/tech-stack/apis.md](../docs/tech-stack/apis.md).
