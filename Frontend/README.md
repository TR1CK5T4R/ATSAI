# AI ATS: Frontend

React 19 + Vite + Tailwind CSS v4 single-page app for the AI mock-interview platform.

## Setup
```bash
cp .env.example .env      # VITE_API_URL=http://localhost:3001/api
npm install
npm run dev               # http://localhost:5173 (allowed by the backend's CORS)
npm run build && npm run preview
npm run lint
```

## Structure
```
src/
├── api/            axios.js (shared client) + one file per backend module
├── store/          useAuthStore.js (Zustand session)
├── constants/      nav.js: role-based navigation, the single source for navbar + guards
├── components/
│   ├── layout/     Navbar, Layout, ProtectedRoute (+ GuestRoute), AuthShell
│   ├── ui/         Button, Card/StatCard, Field, Badge, Modal, Spinner, EmptyState, PageHeader, CourseCard, charts
│   └── chat/       AIAvatar, ChatMessage (interview)
├── hooks/          useSpeech.js: Web Speech API (SpeechRecognition + speechSynthesis)
├── pages/          Landing, Login, Register, Dashboard, ResumeUpload, Interview, Results, Courses, Admin, MockCheckout, NotFound
└── utils/          format.js (dates, prices, score colours)
```

## Authentication
- **Tokens:** the **access token is kept in memory only**, never in localStorage. The **refresh token** is an httpOnly cookie set by the backend. Only `user` (name, email, role) is persisted, so the app knows whether to attempt a silent refresh on reload.
- **Interceptor:** `api/axios.js` attaches `Authorization: Bearer …`. On a `401` it calls `POST /auth/refresh` **once**; parallel 401s share that single call. It then replays the request. If the refresh fails, the session is cleared and the route guard sends the user to `/login`, which returns them to the page they were on after signing in.
- **Errors:** every API error is a normal `Error` with `.message` (the server's message), `.status` and `.data`, so pages can simply call `toast.error(err.message)`.

## Routes and roles
| Path | Roles |
|------|-------|
| `/`, `/login`, `/register` | public (`/login` and `/register` redirect to the dashboard if you're already signed in) |
| `/dashboard`, `/courses`, `/results?id=`, `/checkout/mock` | any signed-in user |
| `/resume`, `/interview` | candidate |
| `/admin` | recruiter (shown as "Candidates": all interviews) and admin (adds course management) |

`<ProtectedRoute roles={[…]} />` shows a loader while the session is being restored. It redirects anonymous users to the login page and shows a "no access" message to signed-in users with the wrong role. The backend enforces the same rules.

## Design
- **Theme:** a dark theme built from tokens in `src/index.css` (`bg-surface`, `text-muted`, `border-border`, `text-primary`, …), using the Inter font.
- **Mobile-first:** a sticky navbar collapses into a menu below `md`, and tables scroll sideways on small screens.
- **Accessibility:** animations are reduced when the user prefers reduced motion.
- **Code splitting:** each route loads on demand, so gsap, recharts and confetti are only downloaded on the pages that use them.

## Voice interview
**`hooks/useSpeech.js`** wraps the Web Speech API:
| API | Behaviour |
|-----|-----------|
| `startListening()` | Continuous recognition with interim results. It **auto-stops after ~1.5 s of silence** once something has been said, then calls `onSilence(text)` |
| `stopListening()` | Manual stop; does not call `onSilence` |
| `speak(text)` | Uses `speechSynthesis` and returns a Promise that resolves when speaking ends. It stops the mic first so the AI never transcribes itself |
| `isListening`, `isSpeaking`, `micPermission`, `error`, `isSupported` | State for the UI |

**Browser quirks handled:**
- Chrome ends continuous recognition sessions on its own; the hook restarts them and keeps the text so far.
- Chrome cuts long utterances, so text is spoken in sentence chunks.
- Some engines never fire `end`; a safety timer always settles `speak()`.
- Voices load asynchronously, so the voice is picked at speak time.

**Interview page turn loop:**
1. The AI speaks the question.
2. The mic auto-listens.
3. After about 1.5 s of silence, the answer goes to `POST /interview/:id/answer`.
4. The AI speaks the reply, and the loop repeats.

**On screen:** the header shows a question counter and a colour-coded **latency indicator** (green up to 2 s, amber up to 4 s, red above). Each AI bubble shows its own latency. Clicking the mic while the AI is talking interrupts it.

**Fallbacks:**
- **No SpeechRecognition** (e.g. Firefox) or a denied microphone: the page switches to typed answers and explains why.
- **Mic denied:** the mic button asks for permission again.
- **Failed answer:** the message is kept and a Retry button appears.

## Tests
```bash
npm test          # Vitest + jsdom + React Testing Library
```
`src/test/speechFakes.js` provides fake versions of `SpeechRecognition` and `speechSynthesis` that the tests drive step by step, since jsdom has neither.
- **`useSpeech.test.jsx`:** silence timing, the automatic restart, interrupting the AI, chunking, the safety timer, and permission errors.
- **`Interview.test.jsx`:** the full voice loop, the typing fallback, retrying a failed answer, finishing the interview, and an unsupported browser.
