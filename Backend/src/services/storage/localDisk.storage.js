/**
 * localDisk.storage.js — Local filesystem driver for the storage abstraction.
 *
 * Writes uploads to <Backend root>/<UPLOAD_DIR>/<yyyy-mm>/<uuid>.<ext>
 * (default: Backend/uploads) and returns a storage key.
 *
 * Files are private: nothing serves the upload dir statically. Callers read
 * them back with getFile(key) behind their own auth checks, and never touch
 * filesystem paths directly.
 */

import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import config from '../../config/env.js';
import ApiError from '../../utils/ApiError.js';

/** Fallback extension map when originalname has no usable extension */
const MIME_EXT = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

/** Create the upload directory once (idempotent — safe to call per-write) */
const ensureStorageReady = async () => {
    await fs.mkdir(config.uploadDirAbs, { recursive: true });
};

/**
 * Build a collision-free storage key: "2026-10/3f2c...c9.pdf"
 * The month bucket keeps directory listings small.
 */
const buildKey = (originalName, mimeType) => {
    const now = new Date();
    const folder = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    const extFromName = path.extname(originalName || '').toLowerCase().replace('.', '');
    const ext = extFromName || MIME_EXT[mimeType] || 'bin';
    // Defence in depth: only ever write plain short alphanumeric extensions
    const safeExt = /^[a-z0-9]{1,10}$/.test(ext) ? ext : 'bin';

    return `${folder}/${crypto.randomUUID()}.${safeExt}`;
};

/** Resolve a key to an absolute path, refusing path-traversal attempts */
const resolveKey = (key) => {
    const absolutePath = path.resolve(config.uploadDirAbs, key);
    if (!absolutePath.startsWith(config.uploadDirAbs + path.sep)) {
        throw new Error(`Invalid storage key: ${key}`);
    }
    return absolutePath;
};

/**
 * Persist a file buffer.
 * @param {{ buffer: Buffer, originalName: string, mimeType: string }} input
 * @returns {Promise<{ key: string, absolutePath: string, size: number, driver: string }>}
 */
const saveFile = async ({ buffer, originalName, mimeType }) => {
    await ensureStorageReady();

    const key = buildKey(originalName, mimeType);
    const absolutePath = resolveKey(key);

    try {
        // The key includes a yyyy-mm bucket → make sure that subfolder exists
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        await fs.writeFile(absolutePath, buffer);
    } catch (err) {
        console.error('❌ Local storage write failed:', err.message);
        throw new ApiError(500, 'Failed to store the uploaded file — please try again');
    }

    return {
        key,
        absolutePath,
        size: buffer.length,
        driver: 'local',
    };
};

/**
 * Delete a stored file. Missing files resolve to `false` (idempotent cleanup).
 * @param {string} key
 * @returns {Promise<boolean>}
 */
const deleteFile = async (key) => {
    try {
        await fs.unlink(resolveKey(key));
        return true;
    } catch (err) {
        if (err.code === 'ENOENT') return false;
        throw err;
    }
};

/**
 * Open a stored file for streaming (used by authenticated download routes).
 * @param {string} key
 * @returns {Promise<{ stream: import('node:stream').Readable, size: number }>}
 * @throws ApiError 404 when the file no longer exists
 */
const getFile = async (key) => {
    const absolutePath = resolveKey(key);
    try {
        const { size } = await fs.stat(absolutePath);
        return { stream: createReadStream(absolutePath), size };
    } catch (err) {
        if (err.code === 'ENOENT') throw new ApiError(404, 'Stored file not found');
        throw err;
    }
};

export default { saveFile, deleteFile, getFile, ensureStorageReady };
