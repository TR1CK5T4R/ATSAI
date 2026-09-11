# Dos and Don'ts

## Do
- **Keep the module layout**: `src/modules/{users,resume,interview,courses}/`, and give each module routes, controller, service, validation and a README.
- **Wrap every async controller in `catchAsync`** and throw `new ApiError(status, message)` for expected failures.
- **Validate every request body, param and query** with a Joi schema in `<module>.validation.js` and the `validate` middleware.
- **Protect routes** with `protect`/`authenticate`, then `authorizeRoles(...)` where a role matters.
- **Read config only through `src/config/env.js`.** Add any new variable to `Backend/.env.example` with a placeholder and a comment.
- **Keep every Gemini prompt in `<module>.ai.js`.** Ask for JSON output, parse it defensively, and respect `GEMINI_MOCK=true` for offline tests.
- **Put structured data in Postgres (Sequelize)** and chat transcripts in Mongo (Mongoose).
- **Store files through `services/storage`.** Never write to disk directly from a module.
- **Write short header comments** explaining what each file does, in the style of the existing code. Keep code modular.
- **Use ESM only** (`import`/`export`). The backend package has `"type": "module"`.
- **Frontend**: call the backend only through `src/api/*` (the shared axios instance) and keep global state in Zustand stores. Use Tailwind for styling.
- **Update `agents/TASK_LOG.md`**, the module README, and `docs/tech-stack/` whenever you add a library, API or env var.

## Don't
- **Never hardcode secrets** (API keys, JWT secrets, DB URLs), and never commit `.env`, `uploads/`, `node_modules/` or `*.log`.
- **Don't put business logic in controllers or routes.** It belongs in services.
- **Don't read `process.env` outside `config/env.js`.**
- **Don't move the global error handler.** It stays in `src/middleware/error.middleware.js`.
- **Don't add CommonJS (`require`) files** or a second Sequelize instance or config.
- **Don't rename `Backend/` or `Frontend/`**, and don't create parallel `client/`/`server/` folders.
- **Don't send passwords, tokens or raw resume files to the LLM.** Send only the extracted text or fields it needs.
- **Don't store the refresh token in localStorage.** It stays in an httpOnly cookie.
- **Don't add Claude (or any AI) as a co-author or author** in commits, PRs or files. The author is always Tushar Singla.
- **Don't add a dependency without a reason.** Note it in `docs/tech-stack/`.
