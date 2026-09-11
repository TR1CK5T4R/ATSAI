# Tech Stack Reference

What the project uses, and why. Update these files whenever you add or remove a library or API.

| File | Covers |
|------|--------|
| [backend.md](backend.md) | Node/Express, databases, auth, validation, uploads, security libraries |
| [frontend.md](frontend.md) | React/Vite, styling, routing, state, charts, animation |
| [apis.md](apis.md) | External APIs (Gemini, Web Speech) and our own REST endpoints |

## At a glance
| Layer | Choice |
|-------|--------|
| Frontend | React 19 + Vite, Tailwind CSS v4, React Router v7, Axios, Zustand |
| Voice | Browser Web Speech API (SpeechRecognition + speechSynthesis) |
| Backend | Node.js (ESM) + Express 5 |
| Auth | JWT (access + refresh), bcrypt |
| Validation | Joi |
| Structured DB | PostgreSQL via Sequelize |
| Document DB | MongoDB via Mongoose |
| LLM | Google Gemini (`@google/generative-ai`) |
| Realtime | Socket.io |
