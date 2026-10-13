/**
 * seedCourses.js — Seed script for the courses table
 *
 * Usage:
 *   node seeders/seedCourses.js
 *
 * What it does:
 *   1. Connects to PostgreSQL (reads DATABASE_URL from .env)
 *   2. Loads all Sequelize models (so sync can run if needed)
 *   3. Upserts 20 curated paid courses covering common skill gaps
 *
 * Safe to re-run — uses upsert so existing rows are not duplicated.
 */

import 'dotenv/config';
import '../src/models/index.js';                   // register all models
import { sequelize } from '../src/config/database.js';
import Course from '../src/modules/courses/Course.model.pg.js';

const COURSES = [
    // ── JavaScript / TypeScript ───────────────────────────────────────────────
    {
        title: 'JavaScript: The Advanced Concepts',
        skillTag: 'JavaScript',
        price: 19.99,
        url: 'https://www.udemy.com/course/advanced-javascript-concepts/',
        description: 'Deep dive into closures, prototypes, async patterns, and performance.',
    },
    {
        title: 'Understanding TypeScript',
        skillTag: 'TypeScript',
        price: 19.99,
        url: 'https://www.udemy.com/course/understanding-typescript/',
        description: 'From basics to advanced generics and utility types.',
    },

    // ── React ─────────────────────────────────────────────────────────────────
    {
        title: 'React — The Complete Guide (incl. Hooks, Redux)',
        skillTag: 'React',
        price: 19.99,
        url: 'https://www.udemy.com/course/react-the-complete-guide-incl-redux/',
        description: 'Comprehensive React course covering Hooks, Context, Redux, and Next.js.',
    },
    {
        title: 'Epic React by Kent C. Dodds',
        skillTag: 'React',
        price: 599.00,
        url: 'https://epicreact.dev/',
        description: 'Deep-dive workshops on React fundamentals, patterns, and performance.',
    },

    // ── Node.js / Backend ─────────────────────────────────────────────────────
    {
        title: 'Node.js, Express, MongoDB & More: The Complete Bootcamp',
        skillTag: 'Node.js',
        price: 19.99,
        url: 'https://www.udemy.com/course/nodejs-express-mongodb-bootcamp/',
        description: 'Build REST APIs and real-time apps with Node, Express, and MongoDB.',
    },
    {
        title: 'NestJS: The Complete Developer\'s Guide',
        skillTag: 'NestJS',
        price: 19.99,
        url: 'https://www.udemy.com/course/nestjs-the-complete-developers-guide/',
        description: 'Enterprise-grade API development with NestJS and TypeORM.',
    },

    // ── Databases ─────────────────────────────────────────────────────────────
    {
        title: 'The Complete SQL Bootcamp',
        skillTag: 'SQL',
        price: 19.99,
        url: 'https://www.udemy.com/course/the-complete-sql-bootcamp/',
        description: 'PostgreSQL from zero to advanced — window functions, CTEs, and indexing.',
    },
    {
        title: 'MongoDB — The Complete Developer\'s Guide',
        skillTag: 'MongoDB',
        price: 19.99,
        url: 'https://www.udemy.com/course/mongodb-the-complete-developers-guide/',
        description: 'Aggregation pipelines, indexing, Atlas, and Mongoose deep-dive.',
    },

    // ── System Design ────────────────────────────────────────────────────────
    {
        title: 'Grokking the System Design Interview',
        skillTag: 'System Design',
        price: 79.00,
        url: 'https://www.educative.io/courses/grokking-the-system-design-interview',
        description: 'Design scalable systems for FAANG-level interviews.',
    },
    {
        title: 'System Design Masterclass',
        skillTag: 'System Design',
        price: 49.00,
        url: 'https://www.hellointerview.com/learn/system-design/in-a-hurry/introduction',
        description: 'Modern system design patterns with real-world examples.',
    },

    // ── Data Structures & Algorithms ─────────────────────────────────────────
    {
        title: 'Master the Coding Interview: Data Structures + Algorithms',
        skillTag: 'DSA',
        price: 19.99,
        url: 'https://www.udemy.com/course/master-the-coding-interview-data-structures-algorithms/',
        description: 'Comprehensive DSA preparation covering arrays, trees, graphs, and DP.',
    },
    {
        title: 'Grokking the Coding Interview Patterns',
        skillTag: 'DSA',
        price: 79.00,
        url: 'https://www.educative.io/courses/grokking-coding-interview-patterns-python',
        description: '26 coding patterns to solve any LeetCode problem.',
    },

    // ── DevOps / Cloud ────────────────────────────────────────────────────────
    {
        title: 'Docker & Kubernetes: The Practical Guide',
        skillTag: 'Docker',
        price: 19.99,
        url: 'https://www.udemy.com/course/docker-kubernetes-the-practical-guide/',
        description: 'Containerise apps and orchestrate them with Kubernetes.',
    },
    {
        title: 'AWS Certified Developer — Associate',
        skillTag: 'AWS',
        price: 19.99,
        url: 'https://www.udemy.com/course/aws-certified-developer-associate-dva-c01/',
        description: 'Hands-on AWS with Lambda, DynamoDB, S3, and API Gateway.',
    },

    // ── Python / AI/ML ────────────────────────────────────────────────────────
    {
        title: 'Python Bootcamp: From Zero to Hero',
        skillTag: 'Python',
        price: 19.99,
        url: 'https://www.udemy.com/course/complete-python-bootcamp/',
        description: 'Complete Python programming from basics to OOP and decorators.',
    },
    {
        title: 'Machine Learning A–Z™',
        skillTag: 'Machine Learning',
        price: 19.99,
        url: 'https://www.udemy.com/course/machinelearning/',
        description: 'Hands-on ML with Python and R covering regression, classification, NLP.',
    },

    // ── Communication / Soft Skills ───────────────────────────────────────────
    {
        title: 'Communication Skills for Beginners',
        skillTag: 'Communication',
        price: 14.99,
        url: 'https://www.udemy.com/course/communication-skills-for-beginners/',
        description: 'Improve verbal and written communication for workplace success.',
    },
    {
        title: 'Technical Interview Masterclass',
        skillTag: 'Interview Skills',
        price: 29.99,
        url: 'https://www.udemy.com/course/master-the-interview/',
        description: 'Ace technical and behavioural interviews at top tech companies.',
    },

    // ── GraphQL / API ─────────────────────────────────────────────────────────
    {
        title: 'GraphQL with React: The Complete Developers Guide',
        skillTag: 'GraphQL',
        price: 19.99,
        url: 'https://www.udemy.com/course/graphql-with-react-course/',
        description: 'Build production-ready GraphQL APIs and consume them in React.',
    },

    // ── Testing ───────────────────────────────────────────────────────────────
    {
        title: 'JavaScript Testing Introduction (Jest + Vitest)',
        skillTag: 'Testing',
        price: 19.99,
        url: 'https://www.udemy.com/course/javascript-unit-testing-the-practical-guide/',
        description: 'Unit, integration, and e2e testing with Jest, Vitest, and Cypress.',
    },
];

// ── Main ──────────────────────────────────────────────────────────────────────
const seed = async () => {
    try {
        await sequelize.authenticate();
        console.log('🐘 Connected to PostgreSQL');

        // Ensure the courses table exists
        await sequelize.sync({ alter: true });

        let inserted = 0;
        let updated  = 0;

        for (const course of COURSES) {
            const [, created] = await Course.upsert(course, {
                conflictFields: ['title'],   // update if title already exists
            });
            created ? inserted++ : updated++;
        }

        console.log(`\n✅ Seeding complete: ${inserted} inserted, ${updated} updated`);
    } catch (err) {
        console.error('❌ Seeding failed:', err.message);
        process.exit(1);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
};

seed();
