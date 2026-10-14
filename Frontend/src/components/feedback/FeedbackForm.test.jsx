import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../../api/feedback.api', () => ({ feedbackApi: { add: vi.fn() } }));
const { feedbackApi } = await import('../../api/feedback.api');
const { default: FeedbackForm } = await import('./FeedbackForm');

describe('FeedbackForm', () => {
    it('requires a rating before submitting', () => {
        render(<FeedbackForm interviewId="int-1" />);
        fireEvent.click(screen.getByRole('button', { name: /save feedback/i }));
        expect(screen.getByText('Choose a rating from 1 to 5')).toBeTruthy();
        expect(feedbackApi.add).not.toHaveBeenCalled();
    });

    it('posts rating + trimmed notes and reports success', async () => {
        feedbackApi.add.mockResolvedValue({ data: { id: 'f1', rating: 4 } });
        const onSaved = vi.fn();
        render(<FeedbackForm interviewId="int-1" onSaved={onSaved} />);

        fireEvent.click(screen.getByRole('radio', { name: /4 stars/i }));
        fireEvent.change(screen.getByLabelText('Notes'), { target: { value: '  Solid system design answers.  ' } });
        fireEvent.click(screen.getByRole('button', { name: /save feedback/i }));

        await waitFor(() => expect(onSaved).toHaveBeenCalledWith({ id: 'f1', rating: 4 }));
        expect(feedbackApi.add).toHaveBeenCalledWith({ interviewId: 'int-1', rating: 4, comments: 'Solid system design answers.' });
    });

    it('prefills an existing review for editing', () => {
        render(<FeedbackForm interviewId="int-1" existing={{ rating: 2, comments: 'Needs depth' }} />);
        expect(screen.getByRole('radio', { name: /2 stars/i }).getAttribute('aria-checked')).toBe('true');
        expect(screen.getByLabelText('Notes').value).toBe('Needs depth');
        expect(screen.getByRole('button', { name: /update feedback/i })).toBeTruthy();
    });

    it('keeps the form when saving fails', async () => {
        feedbackApi.add.mockRejectedValue(new Error('Feedback can only be left on a completed interview'));
        const onSaved = vi.fn();
        render(<FeedbackForm interviewId="int-1" onSaved={onSaved} />);
        fireEvent.click(screen.getByRole('radio', { name: /5 stars/i }));
        fireEvent.click(screen.getByRole('button', { name: /save feedback/i }));
        await waitFor(() => expect(feedbackApi.add).toHaveBeenCalled());
        expect(onSaved).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: /save feedback/i })).toBeTruthy();
    });
});
