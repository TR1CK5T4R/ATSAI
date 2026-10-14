# Backend Libraries

| Library | Used for | Why this one |
|---------|----------|--------------|
| **express** (v5) | HTTP server and routing | The de-facto Node web framework. v5 forwards rejected async promises to the error handler natively |
| **sequelize** + **pg** + **pg-hstore** | PostgreSQL ORM | Relational data (users, resumes, interviews, feedback, courses) needs foreign keys and joins. Sequelize gives models, associations and `sync` in dev |
| **mongoose** | MongoDB ODM | Interview transcripts are append-heavy, nested, variable-length documents, which suit Mongo better than SQL rows |
| **jsonwebtoken** | Access + refresh tokens | Stateless auth. A short-lived access token (15m) plus a refresh token (7d) in an httpOnly cookie |
| **bcrypt** | Password hashing | Adaptive, salted hashing (12 rounds). This is the industry standard |
| **cookie-parser** | Read the refresh-token cookie | Needed for the httpOnly refresh flow |
| **joi** | Request validation | Declarative schemas that the `validate` middleware uses to reject bad input before it reaches services |
| **@google/generative-ai** | Gemini SDK | Resume parsing, question generation and answer evaluation. It supports JSON-style output and a free tier |
| **multer** | Multipart file upload | Handles resume uploads with size/type limits (`MAX_FILE_SIZE`) |
| **pdf-parse** | Extract text from PDF resumes | Lightweight and has no native dependencies |
| **mammoth** | Extract text from DOCX resumes | Produces clean plain text from Word files |
| **socket.io** | Realtime interview events | Rooms per interview (`interview:<id>`) for live updates |
| **helmet** | Secure HTTP headers | One line covers many common header-based attacks |
| **cors** | Cross-origin policy | The frontend (Vite, :5173) and the API run on different origins. The whitelist comes from `CLIENT_URL` |
| **express-rate-limit** | Throttling | 100 req/15 min globally and 10 req/15 min on `/api/auth`, which guards against brute force |
| **morgan** | Request logging | Readable logs in dev and the `combined` format in prod |
| **dotenv** | Load `.env` | Keeps secrets out of code. Only `config/env.js` consumes it |
| **axios** | HTTP client in test scripts | Same client the frontend uses |
| **nodemon** (dev) | Auto-restart in dev | `npm run dev` |
| **sequelize-cli** (dev) | Migrations tooling for later | Production should use migrations instead of `sync` |

## Internal building blocks
- **`utils/ApiError`**: an error class that carries an HTTP status and an `isOperational` flag.
- **`utils/catchAsync`**: wraps async controllers so rejections reach the error handler.
- **`middleware/error.middleware.js`**: the global handler. It hides stack traces in production.
- **`services/storage`**: a driver-based file storage layer (`STORAGE_DRIVER=local` today). Swapping in S3 or Cloudinary needs no module changes.
