import { describe, it, expect } from 'vitest';
import { classifySkills } from './skills';

describe('classifySkills', () => {
    const breakdown = [
        { skill: 'React', score: 88 },
        { skill: 'Node.js', score: 72 },
        { skill: 'SQL', score: 55 },
        { skill: 'Testing', score: 80 },
    ];

    it('marks strengths (≥75), ok and gaps (<70)', () => {
        const rows = classifySkills(breakdown, []);
        const status = Object.fromEntries(rows.map((r) => [r.name, r.status]));
        expect(status).toEqual({ React: 'strength', 'Node.js': 'ok', SQL: 'gap', Testing: 'strength' });
    });

    it('treats evaluator-listed gaps as gaps even with a decent score (name-insensitive)', () => {
        const rows = classifySkills(breakdown, ['testing']);
        expect(rows.find((r) => r.name === 'Testing').status).toBe('gap');
    });

    it('adds unscored gaps so nothing is hidden', () => {
        const rows = classifySkills(breakdown, ['System Design']);
        expect(rows.at(-1)).toMatchObject({ name: 'System Design', score: null, status: 'gap' });
    });

    it('orders strengths first, then ok, then gaps', () => {
        const rows = classifySkills(breakdown, ['System Design']);
        expect(rows.map((r) => r.status)).toEqual(['strength', 'strength', 'ok', 'gap', 'gap']);
        expect(rows[0].name).toBe('React'); // higher score first within a group
    });

    it('carries the target for the chart', () => {
        expect(classifySkills([{ skill: 'Go', score: 40 }], [], 60)[0].target).toBe(60);
    });
});
