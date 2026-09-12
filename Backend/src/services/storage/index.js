/**
 * storage/index.js — Pluggable file-storage facade (Strategy pattern)
 *
 * Business code (e.g. resume.service.js) only ever calls:
 *      storage.saveFile({ buffer, originalName, mimeType }) → { key, ... }
 *      storage.getFile(key)   → { stream, size }   (callers enforce auth first)
 *      storage.deleteFile(key)
 *
 * The concrete driver is chosen by the STORAGE_DRIVER env var, so moving to a
 * cloud provider later is a config change + one new driver file — no changes
 * to any module code:
 *
 *      STORAGE_DRIVER=local      → Backend/uploads (default, zero-setup dev)
 *      STORAGE_DRIVER=s3         → TODO: add s3.storage.js (aws-sdk @aws-sdk/client-s3)
 *      STORAGE_DRIVER=cloudinary → TODO: add cloudinary.storage.js (cloudinary SDK)
 *
 * Every driver MUST implement the same interface:
 *      saveFile({ buffer, originalName, mimeType }) → { key, absolutePath?, size, driver }
 *      getFile(key)                                 → { stream, size } (ApiError 404 if missing)
 *      deleteFile(key)                              → Promise<boolean>
 *      ensureStorageReady()                         → Promise<void>
 */

import config from '../../config/env.js';
import localDisk from './localDisk.storage.js';

const DRIVERS = { local: localDisk };

// Unknown driver names fall back to local with a loud warning (fail-soft at boot)
if (!DRIVERS[config.storageDriver]) {
    console.warn(
        `⚠️  Unknown STORAGE_DRIVER '${config.storageDriver}' — falling back to 'local'. ` +
        `Available: ${Object.keys(DRIVERS).join(', ')}`
    );
}

const activeDriver = DRIVERS[config.storageDriver] ?? localDisk;

const storage = {
    driverName: DRIVERS[config.storageDriver] ? config.storageDriver : 'local',
    saveFile: (input) => activeDriver.saveFile(input),
    getFile: (key) => activeDriver.getFile(key),
    deleteFile: (key) => activeDriver.deleteFile(key),
    ensureStorageReady: () => activeDriver.ensureStorageReady(),
};

export default storage;
