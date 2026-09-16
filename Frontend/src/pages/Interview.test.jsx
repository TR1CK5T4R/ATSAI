import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { FakeRecognition } from '../test/speechFakes';

vi.mock('../api/interview.api', () => ({
    interviewApi: { createInterview: vi.fn(), submitAnswer: vi.fn(), finishInterview: vi.fn() },
}));
vi.mock('../api/resume.api', () => ({
    resumeApi: { getMyResume: vi.fn() },
}));

const { interviewApi } = await import('../api/interview.api');
const { default: Interview } = await import('./Interview');

const CREATED = {
    id: 'int-1',
    targetRole: 'Mid Backend Engineer',
    questionNumber: 1,
    totalQuestions: 8,
    question: { type: 'technical', text: 'How have you used Node.js recently?' },
};

const reply = (overrides = {}) => ({
    data: { reply: 'Thanks. Walk me through HireFlow.', kind: 'question', questionNumber: 2, totalQuestions: 8, done: false, latencyMs: 850, ...overrides },
});

const ResultsProbe = () => {
    const { search } = useLocation();
    return <p>results page {search}</p>;
};

const renderPage = () =>
    render(
        <MemoryRouter initialEntries={[{ pathname: '/interview', state: { resumeId: 'resume-1' } }]}>
            <Routes>
                <Route path="/interview" element={<Interview />} />
                <Route path="/results" element={<ResultsProbe />} />
                <Route path="/dashboard" element={<p>dashboard</p>} />
            </Routes>
        </MemoryRouter>
    );

const synth = () => window.speechSynthesis;
const rec = () => FakeRecognition.latest();
const textbox = () => screen.getByLabelText('Your answer');

const startInterview = async () => {
    fireEvent.click(screen.getByRole('button', { name: /start interview/i }));
    await screen.findByText(CREATED.question.text);
};

describe('Interview page', () => {
    beforeEach(() => {
        interviewApi.createInterview.mockResolvedValue({ data: CREATED });
        interviewApi.submitAnswer.mockResolvedValue(reply());
        interviewApi.finishInterview.mockResolvedValue({ data: { score: 80 } });
        vi.spyOn(window, 'confirm').mockReturnValue(true);
    });

    it('runs the voice loop: speak → listen → silence → answer → speak reply → listen', async () => {
        renderPage();
        await startInterview();

        expect(interviewApi.createInterview).toHaveBeenCalledWith('resume-1');
        expect(screen.getByText('Question 1 of 8')).toBeTruthy();
        expect(synth().spoken).toContain(CREATED.question.text);
        expect(rec().start).not.toHaveBeenCalled(); // never listen while the AI talks

        act(() => synth().finishAll());
        await waitFor(() => expect(rec().start).toHaveBeenCalledTimes(1));
        expect(screen.getByText(/Listening… pause for a moment to send/)).toBeTruthy();

        act(() => rec().emit([{ text: 'I built payment APIs in Node.js', final: true }]));
        expect(textbox().value).toBe('I built payment APIs in Node.js');

        // ~1.5 s of silence → answer is sent automatically
        await waitFor(() => expect(interviewApi.submitAnswer).toHaveBeenCalledWith('int-1', 'I built payment APIs in Node.js'), { timeout: 3000 });
        await screen.findByText('Thanks. Walk me through HireFlow.');
        expect(screen.getByText('Question 2 of 8')).toBeTruthy();
        expect(screen.getAllByTitle(/Response time|Round trip/).length).toBeGreaterThan(0); // latency indicator
        expect(synth().spoken).toContain('Thanks. Walk me through HireFlow.');

        act(() => synth().finishAll());
        await waitFor(() => expect(rec().start).toHaveBeenCalledTimes(2)); // loops back to listening
    });

    it('falls back to typing when the microphone is denied', async () => {
        navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(Object.assign(new Error('no'), { name: 'NotAllowedError' }));
        renderPage();
        await startInterview();

        expect(screen.getByText(/Microphone access/)).toBeTruthy();
        act(() => synth().finishAll());
        expect(rec().start).not.toHaveBeenCalled();

        fireEvent.change(textbox(), { target: { value: 'Typed answer' } });
        fireEvent.keyDown(textbox(), { key: 'Enter' });
        await waitFor(() => expect(interviewApi.submitAnswer).toHaveBeenCalledWith('int-1', 'Typed answer'));
    });

    it('keeps the answer and offers a retry when sending fails', async () => {
        interviewApi.submitAnswer.mockRejectedValueOnce(Object.assign(new Error('Cannot reach the server'), { status: undefined }));
        renderPage();
        await startInterview();
        act(() => synth().finishAll());
        await waitFor(() => expect(rec().start).toHaveBeenCalledTimes(1));

        act(() => rec().emit([{ text: 'My answer', final: true }]));
        await screen.findByText('Your answer wasn’t sent.', {}, { timeout: 3000 });
        expect(textbox().value).toBe('My answer');
        expect(screen.queryAllByText('My answer', { selector: 'p' })).toHaveLength(0); // optimistic bubble removed

        fireEvent.click(screen.getByRole('button', { name: /retry/i }));
        await screen.findByText('Thanks. Walk me through HireFlow.');
        expect(interviewApi.submitAnswer).toHaveBeenCalledTimes(2);
    });

    it('shows the finish step after the closing line and does not listen again', async () => {
        interviewApi.submitAnswer.mockResolvedValueOnce(reply({ reply: 'That was the last question.', kind: 'closing', questionNumber: 8, done: true }));
        renderPage();
        await startInterview();
        act(() => synth().finishAll());

        fireEvent.change(textbox(), { target: { value: 'Final answer' } });
        fireEvent.click(screen.getByLabelText('Send answer'));
        await screen.findByText('That was the last question.');
        expect(screen.getByText('All questions answered')).toBeTruthy();

        const startsBefore = rec().start.mock.calls.length;
        act(() => synth().finishAll());
        expect(rec().start.mock.calls.length).toBe(startsBefore);

        fireEvent.click(screen.getByRole('button', { name: /finish & see my report/i }));
        await screen.findByText('results page ?id=int-1');
        expect(interviewApi.finishInterview).toHaveBeenCalledWith('int-1');
    });

    it('End interview confirms, evaluates and opens the report', async () => {
        renderPage();
        await startInterview();
        act(() => synth().finishAll());
        fireEvent.change(textbox(), { target: { value: 'An answer' } });
        fireEvent.click(screen.getByLabelText('Send answer'));
        await screen.findByText('Thanks. Walk me through HireFlow.');

        fireEvent.click(screen.getByRole('button', { name: /end interview/i }));
        expect(window.confirm).toHaveBeenCalled();
        await screen.findByText('results page ?id=int-1');
        expect(synth().cancel).toHaveBeenCalled();
    });

    it('End interview with no answers leaves without a report', async () => {
        renderPage();
        await startInterview();
        fireEvent.click(screen.getByRole('button', { name: /end interview/i }));
        await screen.findByText('dashboard');
        expect(interviewApi.finishInterview).not.toHaveBeenCalled();
    });

    it('shows a clear error if the interview cannot be created', async () => {
        interviewApi.createInterview.mockRejectedValueOnce(new Error('AI question generation failed'));
        renderPage();
        fireEvent.click(screen.getByRole('button', { name: /start interview/i }));
        await waitFor(() => expect(screen.getByRole('button', { name: /start interview/i })).toBeTruthy());
        expect(screen.queryByText(CREATED.question.text)).toBeNull();
    });
});

describe('Interview page — browser without SpeechRecognition', () => {
    it('explains the text fallback and never starts recognition', async () => {
        vi.resetModules();
        const saved = window.webkitSpeechRecognition;
        delete window.webkitSpeechRecognition;
        try {
            const { interviewApi: api } = await import('../api/interview.api');
            api.createInterview.mockResolvedValue({ data: CREATED });
            const { default: FreshInterview } = await import('./Interview');
            render(
                <MemoryRouter initialEntries={[{ pathname: '/interview', state: { resumeId: 'resume-1' } }]}>
                    <FreshInterview />
                </MemoryRouter>
            );
            expect(screen.getByText(/isn’t supported in this browser/)).toBeTruthy();
            fireEvent.click(screen.getByRole('button', { name: /start interview/i }));
            await screen.findByText(CREATED.question.text);
            expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
            expect(screen.getByLabelText(/not supported in this browser/)).toHaveProperty('disabled', true);
            expect(FakeRecognition.instances).toHaveLength(0);
        } finally {
            window.webkitSpeechRecognition = saved;
        }
    });
});
