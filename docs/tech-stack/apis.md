# APIs

## External APIs
| API | Where | Why |
|-----|-------|-----|
| **Google Gemini** (`GEMINI_API_KEY`, `GEMINI_MODEL`) | `modules/resume/resume.ai.js`, `modules/interview/interview.ai.js` | Turns a resume into structured JSON, generates tailored interview questions, scores answers and finds skill gaps. `GEMINI_MOCK=true` gives deterministic offline output for tests |
| **Web Speech API** (browser) | `Frontend/src/hooks/useSpeech.js` | Real-time voice interview at no cost and with no extra backend |

## Our REST endpoints
Base URL: `http://localhost:3001`. Routes marked 🔒 need `Authorization: Bearer <accessToken>`.

### Auth (`/api/auth`, also `/auth`)
| Method | Path | Notes |
|--------|------|-------|
| POST | `/register` | Joi validated. Returns an access token and sets the refresh cookie |
| POST | `/login` | Same as above |
| POST | `/refresh` (alias `/refresh-token`) | Uses the refresh cookie |
| POST | `/logout` | Clears the cookie |
| GET 🔒 | `/me` | Current user profile |

### Candidate (`/api/candidate`, also `/candidate`). Role: `candidate`
| GET 🔒 | `/profile` |
|---|---|
| PUT 🔒 | `/profile` (Joi validated) |

### Users (`/api/users`)
| Method | Path |
|--------|------|
| POST | `/register`, `/login` |
| GET / PUT 🔒 | `/profile` |

### Resume (`/api/resume`)
| Method | Path | Notes |
|--------|------|-------|
| POST 🔒 | `/upload` | multipart `resume` file (PDF/DOCX) |
| GET 🔒 | `/my` | The current user's resumes |
| GET 🔒 | `/score/latest` | Latest ATS score |
| GET 🔒 | `/:id` | Single resume |

### Interview (`/api/interview`)
| Method | Path |
|--------|------|
| POST 🔒 | `/start` |
| POST 🔒 | `/answer` |
| POST 🔒 | `/complete` |
| GET 🔒 | `/:sessionId` |

### Courses (`/api/courses`): *pending*

### Misc
`GET /health` returns uptime and environment. `GET /` is a sanity check.
