import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

vi.mock('../../api/users.api', () => ({ usersApi: { listCandidates: vi.fn() } }));
vi.mock('../../api/interview.api', () => ({ interviewApi: { getHistory: vi.fn() } }));
vi.mock('../../api/feedback.api', () => ({ feedbackApi: { add: vi.fn() } }));

const { usersApi } = await import('../../api/users.api');
const { interviewApi } = await import('../../api/interview.api');
const { feedbackApi } = await import('../../api/feedback.api');
const { default: CandidatesTab } = await import('./CandidatesTab');

const ADA = {
    id: 'u-ada', name: 'Ada Lovelace', email: 'ada@example.com', interviewCount: 3, completedCount: 2,
    avgScore: 71, bestScore: 81, latest: { interviewId: 'i-2', score: 81, completedAt: '2026-10-10T10:00:00Z' },
};
const ZED = { id: 'u-zed', name: 'Zed New', email: 'zed@example.com', interviewCount: 0, completedCount: 0, avgScore: null, bestScore: null, latest: null };

const INTERVIEWS = [
    { id: 'i-2', status: 'completed', score: 81, targetRole: 'Backend', completedAt: '2026-10-10T10:00:00Z', feedbacks: [{ id: 'f-1', rating: 4, comments: 'Good', reviewer: { id: 'other', name: 'Ray' } }] },
    { id: 'i-3', status: 'ongoing', score: null, targetRole: 'Backend', createdAt: '2026-10-12T10:00:00Z', feedbacks: [] },
];

const renderTab = () => render(<MemoryRouter><CandidatesTab /></MemoryRouter>);

describe('CandidatesTab (recruiter view)', () => {
    beforeEach(() => {
        useAuthStore.setState({ user: { id: 'me', name: 'Bob', role: 'recruiter' }, status: 'authenticated' });
        usersApi.listCandidates.mockResolvedValue({ data: { total: 2, items: [ADA, ZED] } });
        interviewApi.getHistory.mockResolvedValue({ data: { items: INTERVIEWS } });
        feedbackApi.add.mockResolvedValue({ data: { id: 'f-2', rating: 5 } });
    });

    it('lists candidates with their scores', async () => {
        renderTab();
        const row = (await screen.findByText('Ada Lovelace')).closest('button');
        expect(within(row).getByText('2/3')).toBeTruthy();
        expect(within(row).getByText('71')).toBeTruthy();
        expect(within(row).getAllByText('81')).toHaveLength(2); // best + latest
        const zed = screen.getByText('Zed New').closest('button');
        expect(within(zed).getAllByText('—').length).toBeGreaterThanOrEqual(2);
    });

    it('searches (debounced) by name or email', async () => {
        renderTab();
        await screen.findByText('Ada Lovelace');
        fireEvent.change(screen.getByLabelText('Search candidates'), { target: { value: 'ada' } });
        await waitFor(() => expect(usersApi.listCandidates).toHaveBeenLastCalledWith({ q: 'ada', limit: 20, offset: 0 }));
    });

    it('expands a candidate and leaves feedback via POST /feedback/add', async () => {
        renderTab();
        fireEvent.click((await screen.findByText('Ada Lovelace')).closest('button'));
        await waitFor(() => expect(interviewApi.getHistory).toHaveBeenCalledWith({ userId: 'u-ada', limit: 50 }));

        expect(await screen.findByText('Not finished')).toBeTruthy(); // ongoing interview: no feedback button
        const buttons = screen.getAllByRole('button', { name: /^feedback$/i });
        expect(buttons).toHaveLength(1);

        fireEvent.click(buttons[0]);
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText('Other reviewers')).toBeTruthy(); // Ray's review shown
        fireEvent.click(within(dialog).getByRole('radio', { name: /5 stars/i }));
        fireEvent.change(within(dialog).getByLabelText('Notes'), { target: { value: 'Strong hire' } });
        fireEvent.click(within(dialog).getByRole('button', { name: /save feedback/i }));

        await waitFor(() => expect(feedbackApi.add).toHaveBeenCalledWith({ interviewId: 'i-2', rating: 5, comments: 'Strong hire' }));
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
        expect(interviewApi.getHistory).toHaveBeenCalledTimes(2); // refreshed after saving
    });
});
