/**
 * createAdmin.js — Create (or promote) an admin account
 *
 * Admins can't self-register through /auth/register, so this script is the
 * only way to get one. Credentials come from env vars (not CLI args) so the
 * password never lands in shell history:
 *
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='S3cure!pass' ADMIN_NAME='Site Admin' npm run create:admin
 *
 * If a user with that email exists it is promoted to admin (password unchanged).
 */

import 'dotenv/config';
import '../src/models/index.js';
import { sequelize } from '../src/config/database.js';
import User from '../src/modules/users/User.model.js';

const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = 'Admin' } = process.env;

const run = async () => {
    if (!ADMIN_EMAIL) {
        throw new Error('Set ADMIN_EMAIL (and ADMIN_PASSWORD for a new account)');
    }
    await sequelize.authenticate();

    const existing = await User.findOne({ where: { email: ADMIN_EMAIL.toLowerCase() } });
    if (existing) {
        await existing.update({ role: 'admin' });
        console.log(`✅ Promoted ${existing.email} to admin`);
        return;
    }

    if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
        throw new Error('ADMIN_PASSWORD (min 8 chars) is required to create a new admin');
    }
    // passwordHash is hashed by the User model's beforeCreate hook (bcrypt)
    const admin = await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL.toLowerCase(), passwordHash: ADMIN_PASSWORD, role: 'admin' });
    console.log(`✅ Created admin ${admin.email}`);
};

run()
    .catch((err) => {
        console.error('❌', err.message);
        process.exitCode = 1;
    })
    .finally(() => sequelize.close());
