/**
 * auth.model.js — Re-exports the canonical User model
 *
 * The single source of truth for the User Sequelize model lives in
 * src/modules/users/User.model.js. This file simply re-exports it so
 * that the auth module (auth.service.js, auth.middleware.js) can import
 * from a local relative path without knowing about the users/ directory.
 */

export { default } from '../users/User.model.js';
