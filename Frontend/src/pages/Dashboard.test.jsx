import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

vi.mock('../api/resume.api', () => ({ resumeApi: { getMyResume: vi.fn(), getLatestScore: vi.fn() } }));
vi.mock('../api/interview.api', () => ({ interviewApi: { getHistory: vi.fn() } }));

const { resumeApi } = await import('../api/resume.api');
const { interviewApi } = await import('../api/interview.api');
const { default: Dashboard } = await import('./Dashboard');

const interview = (n, extra = {}) => ({ id: `i-${n}`, status: 'completed', score: 60 + n, targetRole: `Role ${n}`, createdAt: '2026-10-01T10:00:00Z', ...extra });

const renderDashboard = () => render(<MemoryRouter><Dashboard /></MemoryRouter>);

describe('Candidate dashboard', () => {
    beforeEach(() => {
        useAuthStore.setState({ user: { id: 'u1', name: 'Ada Lovelace', role: 'candidate' }, status: 'authenticated' });
        resumeApi.getLatestScore.mockResolvedValue({ score: 64 });
    });

    it('shows the upload-resume CTA when there is no resume', async () => {
        resumeApi.getMyResume.mockResolvedValue({ data: [] });
        interviewApi.getHistory.mockResolvedValue({ data: { total: 0, items: [] } });
        renderDashboard();

        expect(await screen.findByRole('heading', { name: 'No resume yet' })).toBeTruthy(); // CTA card
        const uploadLinks = screen.getAllByRole('link', { name: /upload resume/i });
        expect(uploadLinks.every((a) => a.getAttribute('href') === '/resume')).toBe(true);
        expect(screen.getByText('No interviews yet')).toBeTruthy();
    });

    it('lists interview history, links completed ones to their report, and pages through it', async () => {
        resumeApi.getMyResume.mockResolvedValue({ data: [{ id: 'r1', createdAt: '2026-10-01T10:00:00Z', skills: ['React', 'SQL'] }] });
        const items = [interview(1, { status: 'ongoing', score: null }), ...Array.from({ length: 11 }, (_, i) => interview(i + 2))];
        interviewApi.getHistory.mockResolvedValue({ data: { total: items.length, items } });
        renderDashboard();

        expect(await screen.findByText('Interview history')).toBeTruthy();
        expect(interviewApi.getHistory).toHaveBeenCalledWith({ limit: 50 });
        expect(screen.getByRole('link', { name: /update resume/i })).toBeTruthy(); // CTA still offered
        expect(screen.getByText(/2 skills found/)).toBeTruthy();

        expect(screen.getByText('Not finished')).toBeTruthy();
        expect(screen.getByText('Role 2').closest('a').getAttribute('href')).toBe('/results?id=i-2');
        expect(screen.getByText('Role 1').closest('a')).toBeNull(); // unfinished → no report link

        expect(screen.queryByText('Role 12')).toBeNull(); // 10 shown at first
        fireEvent.click(screen.getByRole('button', { name: /show more/i }));
        expect(screen.getByText('Role 12')).toBeTruthy();
    });
});
