/**
 * resume.parser.js — Text extraction from uploaded resume files
 *
 *  PDF  → pdf-parse v2 (new class-based API: new PDFParse({ data }).getText())
 *  DOCX → mammoth.extractRawText (legacy .doc binary format is NOT supported)
 *
 * Security/robustness notes:
 *  - Magic bytes are checked before parsing, so a renamed file cannot poison
 *    the wrong parser (multer's mimetype/extension filter is not enough on
 *    its own — clients can lie about mimetypes).
 *  - Extracted text is normalised and length-capped before it is sent to
 *    Gemini, keeping prompts bounded and costs predictable.
 */

import path from 'node:path';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import ApiError from '../../utils/ApiError.js';

// %PDF-  → every PDF starts with this header (versions 1.x–2.x)
const PDF_MAGIC = Buffer.from('%PDF-');
// PK\x03\x04 → ZIP local file header (DOCX is a ZIP container)
const DOCX_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

/** Hard cap on the text we forward to the LLM (~15k chars ≈ 4k tokens) */
const MAX_TEXT_LENGTH = 15_000;

/** Minimum plausible resume length — guards against blank/garbage extractions */
const MIN_TEXT_LENGTH = 30;

/**
 * Detect the real file kind from magic bytes, with the extension as a
 * tie-breaker hint. Returns 'pdf' | 'docx' | null.
 */
const detectKind = (buffer, filename) => {
    const ext = path.extname(filename || '').toLowerCase();

    if (buffer.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) return 'pdf';
    if (ext === '.pdf') return 'pdf'; // header damaged but claimed PDF — let pdf-parse emit a precise error

    if (buffer.subarray(0, DOCX_MAGIC.length).equals(DOCX_MAGIC) && ext !== '.pdf') return 'docx';
    if (ext === '.docx') return 'docx';

    return null;
};

/** Extract text from a PDF buffer using pdf-parse v2 */
const extractFromPdf = async (buffer) => {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
        const result = await parser.getText();
        return result.text || '';
    } finally {
        // Always release pdfjs worker/document resources
        await parser.destroy().catch(() => {});
    }
};

/** Extract raw text from a DOCX buffer using mammoth */
const extractFromDocx = async (buffer) => {
    const { value } = await mammoth.extractRawText({ buffer });
    return value || '';
};

/** Collapse whitespace noise so the LLM prompt stays compact */
const normaliseText = (raw) =>
    raw
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

/**
 * Main entry point: turn a multer file object into clean plain text.
 *
 * @param {import('multer').File} file - multer file (buffer in memory)
 * @returns {Promise<{ text: string, kind: 'pdf'|'docx', truncated: boolean }>}
 * @throws ApiError 400 for unsupported types, 422 for unreadable/empty files
 */
const extractResumeText = async (file) => {
    const kind = detectKind(file.buffer, file.originalname);
    if (!kind) {
        throw new ApiError(400, 'Unsupported file type — please upload a PDF or DOCX resume');
    }

    let raw;
    try {
        raw = kind === 'pdf' ? await extractFromPdf(file.buffer) : await extractFromDocx(file.buffer);
    } catch (err) {
        console.error(`❌ ${kind.toUpperCase()} text extraction failed:`, err.message);
        throw new ApiError(
            422,
            `Could not read the uploaded ${kind.toUpperCase()} — the file may be corrupted or password-protected`
        );
    }

    const text = normaliseText(raw);

    if (text.length < MIN_TEXT_LENGTH) {
        throw new ApiError(
            422,
            'No readable text found in the file — scanned/image-only resumes are not supported yet'
        );
    }

    const truncated = text.length > MAX_TEXT_LENGTH;
    if (truncated) {
        console.warn(`⚠️  Resume text truncated from ${text.length} to ${MAX_TEXT_LENGTH} chars before AI parsing`);
    }

    return { text: truncated ? text.slice(0, MAX_TEXT_LENGTH) : text, kind, truncated };
};

export { extractResumeText, detectKind };
