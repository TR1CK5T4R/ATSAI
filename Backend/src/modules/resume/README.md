# 📄 Resume Module — Upload, Parse & Structured Storage

Candidates upload a resume (PDF/DOCX); the file is stored locally through a
swappable storage abstraction, its text is extracted, and **Gemini** returns a
strict-JSON structured profile which is validated, then persisted.

```
POST /api/resume/upload
   │  multer (5 MB, PDF/DOCX only)
   │  storage.saveFile()        ← src/services/storage (local driver → Backend/uploads)
   │  extractResumeText()       ← pdf-parse v2 (PDF) / mammoth (DOCX)
   │  parseResumeWithGemini()   ← strict responseSchema + Joi validation + 3 retries
   ▼
PostgreSQL resumes.parsed_json  (+ best-effort MongoDB mirror of raw text)
```

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/resume/upload` | Bearer (any role) | Multipart upload, field **`resume`**. Returns `201 { id, fileUrl, structured, mongoId }` |
| GET | `/api/resume/:id` | Bearer | One resume. Owner only for candidates; recruiter/admin can read any |
| GET | `/api/resume/:id/file` | Bearer | Downloads the original PDF/DOCX (same access rules). This is the `fileUrl` value |
| GET | `/api/resume/my` | Bearer | Current user's resumes (newest first) |
| GET | `/api/resume/score/latest` | Bearer | Heuristic 0–100 resume-strength score |

### Parsed JSON contract (stored in `resumes.parsed_json`)

```json
{
  "name": "Aarav Sharma",
  "email": "aarav.sharma@example.com",
  "skills": ["React", "Node.js", "PostgreSQL"],
  "experience": [{ "title": "", "company": "", "startDate": "", "endDate": "", "description": "" }],
  "education": [{ "degree": "", "institution": "", "year": "" }],
  "projects": [{ "name": "", "description": "", "technologies": [""] }],
  "experienceYears": 3.5,
  "seniorityLevel": "Mid"
}
```

Enforced twice: natively by Gemini (`responseSchema` +
`responseMimeType: application/json`) and again by Joi (`RESUME_PARSED_SCHEMA`)
with unknown-key stripping.

## Reliability

- **Retries**: 3 attempts, exponential backoff (750 ms → 1.5 s) + jitter.
  Both network/API failures *and* Joi schema failures trigger a retry.
- **Clear errors**: after the final attempt → `502 "AI resume parsing failed
  after 3 attempts — <reason>"`. No key configured → `503` with setup
  instructions. We deliberately do **not** fall back to fake data on real
  failures (a fabricated profile would poison downstream interviews).
- **No orphans**: if anything fails after the file is saved, the file is deleted.
- Text is capped at 15 000 chars before the LLM call (cost control).
- Scanned/image-only resumes → `422` (OCR is a future feature).

## File storage abstraction

`src/services/storage/index.js` picks the driver from `STORAGE_DRIVER`:

| Driver | Status | Storage location |
|--------|--------|------------------|
| `local` | ✅ default | `Backend/uploads/<yyyy-mm>/<uuid>.<ext>` (git-ignored) |
| `s3` | TODO | add `s3.storage.js` implementing the same interface |
| `cloudinary` | TODO | add `cloudinary.storage.js` implementing the same interface |

Driver interface: `saveFile({buffer, originalName, mimeType}) → {key, ...}`,
`getFile(key) → {stream, size}`, `deleteFile(key)`, `ensureStorageReady()`.

Uploaded files are **private**. Nothing serves `uploads/` statically. The row
stores the driver key in `fileKey`, which is never returned to clients. The only way to
fetch a file is `GET /api/resume/:id/file`, which requires a login and an ownership check.

## Environment variables

```env
MAX_FILE_SIZE=5242880        # 5 MB
STORAGE_DRIVER=local         # local | s3 | cloudinary
UPLOAD_DIR=uploads           # relative to Backend/ (local driver only)
GEMINI_API_KEY=<your key>    # required for real parsing
GEMINI_MODEL=gemini-2.5-flash
GEMINI_MOCK=false            # true → deterministic offline parsing (dev/tests only)
```

## Testing

```bash
cd Backend
npm run test:resume   # boots an ephemeral server, exercises every endpoint
```

Covers: PDF upload happy path, `GET /:id`, ownership 403, unknown id 404,
non-PDF/DOCX 400, oversize 413, authenticated download via `fileUrl` (and no public `/uploads` access), and the
LLM-failure → retry → 502 path. Uses an in-memory generated sample PDF
(`Aarav Sharma` resume) — no fixture files needed.
