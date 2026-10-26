/**
 * seedDemoUsers.js — Create the public demo accounts listed in the README
 *
 * Usage:
 *   npm run seed:demo
 *
 * Safe to re-run — existing demo users get their role and password reset,
 * so the accounts keep working even if a visitor changed them.
 */

import 'dotenv/config';
import '../src/models/index.js';
import { sequelize } from '../src/config/database.js';
import User from '../src/modules/users/User.model.js';

const DEMO_PASSWORD = 'Demo@1234';

const DEMO_USERS = [
    { name: 'Demo Candidate', email: 'candidate@demo.com', role: 'candidate' },
    { name: 'Demo Interviewer', email: 'interviewer@demo.com', role: 'recruiter' },
];

const run = async () => {
    await sequelize.authenticate();

    for (const { name, email, role } of DEMO_USERS) {
        // passwordHash is hashed by the User model's beforeCreate/beforeUpdate hooks (bcrypt)
        const existing = await User.findOne({ where: { email } });
        if (existing) {
            await existing.update({ name, role, passwordHash: DEMO_PASSWORD });
            console.log(`✅ Reset ${email} (${role})`);
        } else {
            await User.create({ name, email, role, passwordHash: DEMO_PASSWORD });
            console.log(`✅ Created ${email} (${role})`);
        }
    }
};

run()
    .catch((err) => {
        console.error('❌', err.message);
        process.exitCode = 1;
    })
    .finally(() => sequelize.close());
