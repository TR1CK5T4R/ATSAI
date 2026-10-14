import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

vi.mock('../api/interview.api', () => ({ interviewApi: { getInterview: vi.fn(), getHistory: vi.fn() } }));
vi.mock('../api/courses.api', () => ({ coursesApi: { getRecommendations: vi.fn(), checkout: vi.fn() } }));
vi.mock('../api/feedback.api', () => ({ feedbackApi: { listForInterview: vi.fn(), add: vi.fn() } }));

const { interviewApi } = await import('../api/interview.api');
const { coursesApi } = await import('../api/courses.api');
const { feedbackApi } = await import('../api/feedback.api');
const { default: Results } = await import('./Results');

const REPORT = {
    interview: { id: 'int-1', userId: 'cand-1', targetRole: 'Mid Backend Engineer', status: 'completed', updatedAt: '2026-10-10T10:00:00Z' },
    report: {
        score: 72,
        summary: 'Solid fundamentals; system design needs depth.',
        strengths: ['Clear API design'],
        weaknesses: ['Shallow on scaling'],
        skillGaps: ['System Design'],
        skillBreakdown: [{ skill: 'Node.js', score: 85 }, { skill: 'SQL', score: 62 }, { skill: 'React', score: 78 }],
        completedAt: '2026-10-10T10:00:00Z',
    },
};
const COURSE = { id: 'c-1', title: 'System Design Masterclass', skillTag: 'System Design', price: 19.99, currency: 'USD', url: 'https://example.com', description: 'Scale things' };

const Probe = () => {
    const { pathname, search } = useLocation();
    return <p>at {pathname}{search}</p>;
};

const renderResults = () =>
    render(
        <MemoryRouter initialEntries={['/results?id=int-1']}>
            <Routes>
                <Route path="/results" element={<Results />} />
                <Route path="/checkout/mock" element={<Probe />} />
            </Routes>
        </MemoryRouter>
    );

describe('Results page', () => {
    beforeEach(() => {
        interviewApi.getInterview.mockResolvedValue({ data: REPORT });
        coursesApi.getRecommendations.mockResolvedValue({ data: { recommendations: [{ course: COURSE, why: 'Directly targets "System Design".' }] } });
        coursesApi.checkout.mockResolvedValue({ data: { paymentLink: 'http://localhost:3000/checkout/mock?orderId=o1&courseId=c-1' } });
        feedbackApi.listForInterview.mockResolvedValue({ data: [] });
    });

    it('shows score, written feedback, strengths-vs-gaps and recommendations', async () => {
        useAuthStore.setState({ user: { id: 'cand-1', name: 'Ada', role: 'candidate' }, status: 'authenticated' });
        renderResults();

        expect(await screen.findByText('Solid fundamentals; system design needs depth.')).toBeTruthy();
        expect(interviewApi.getInterview).toHaveBeenCalledWith('int-1');
        expect(screen.getByText('72')).toBeTruthy(); // circular score
        expect(screen.getByText('Strengths vs gaps')).toBeTruthy();
        const strengths = screen.getByText('Strengths', { selector: 'p' }).parentElement;
        const gaps = screen.getByText('Gaps to close').parentElement;
        expect(within(strengths).getByText('Node.js · 85')).toBeTruthy();
        expect(within(gaps).getByText('SQL · 62')).toBeTruthy();        // below the target
        expect(within(gaps).getByText('System Design')).toBeTruthy();   // evaluator-listed, unscored
        expect(await screen.findByText('System Design Masterclass')).toBeTruthy();
        expect(screen.getByText('Directly targets "System Design".')).toBeTruthy();
        expect(screen.queryByText('Reviewer feedback')).toBeNull(); // candidates never see reviewer notes
    });

    it('Buy button starts checkout and follows the payment link', async () => {
        useAuthStore.setState({ user: { id: 'cand-1', name: 'Ada', role: 'candidate' }, status: 'authenticated' });
        renderResults();
        fireEvent.click(await screen.findByRole('button', { name: /enroll/i }));
        await waitFor(() => expect(coursesApi.checkout).toHaveBeenCalledWith('c-1'));
        expect(await screen.findByText('at /checkout/mock?orderId=o1&courseId=c-1')).toBeTruthy();
    });

    it('recruiters see reviewer feedback and no buy buttons', async () => {
        useAuthStore.setState({ user: { id: 'rec-1', name: 'Bob', role: 'recruiter' }, status: 'authenticated' });
        renderResults();
        expect(await screen.findByText('Reviewer feedback')).toBeTruthy();
        await waitFor(() => expect(feedbackApi.listForInterview).toHaveBeenCalledWith('int-1'));
        expect(screen.getByRole('button', { name: /leave feedback/i })).toBeTruthy();
        await screen.findByText('System Design Masterclass');
        expect(screen.queryByRole('button', { name: /enroll/i })).toBeNull();
    });
});
