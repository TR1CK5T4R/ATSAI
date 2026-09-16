import { describe, it, expect, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import useSpeech, { splitForSpeech, SPEECH_SUPPORT } from './useSpeech';
import { FakeRecognition } from '../test/speechFakes';

const setup = (options = {}) => {
    const onTranscript = vi.fn();
    const onSilence = vi.fn();
    const hook = renderHook(() => useSpeech({ silenceMs: 1500, onTranscript, onSilence, ...options }));
    return { ...hook, onTranscript, onSilence, rec: () => FakeRecognition.latest() };
};

describe('useSpeech — listening', () => {
    it('detects support', () => {
        expect(SPEECH_SUPPORT).toEqual({ recognition: true, synthesis: true });
    });

    it('starts continuous recognition with interim results', () => {
        const { result, rec } = setup();
        act(() => result.current.startListening());
        expect(rec().continuous).toBe(true);
        expect(rec().interimResults).toBe(true);
        expect(rec().start).toHaveBeenCalledTimes(1);
        expect(result.current.isListening).toBe(true);
    });

    it('reports final + interim text as one transcript', () => {
        const { result, rec, onTranscript } = setup();
        act(() => result.current.startListening());
        act(() => rec().emit([{ text: 'I built', final: true }, { text: ' a payments API', final: false }]));
        expect(onTranscript).toHaveBeenLastCalledWith('I built a payments API');
    });

    it('auto-stops after 1.5 s of silence and hands over the text', () => {
        vi.useFakeTimers();
        const { result, rec, onSilence } = setup();
        act(() => result.current.startListening());
        act(() => rec().emit([{ text: 'Hello there', final: true }]));

        act(() => vi.advanceTimersByTime(1000));
        act(() => rec().emit([{ text: 'Hello there', final: true }, { text: 'more words', final: false }], 1)); // still talking → countdown restarts
        act(() => vi.advanceTimersByTime(1499));
        expect(onSilence).not.toHaveBeenCalled();

        act(() => vi.advanceTimersByTime(1));
        expect(onSilence).toHaveBeenCalledWith('Hello there more words');
        expect(rec().stop).toHaveBeenCalled();
        expect(result.current.isListening).toBe(false);
    });

    it('does not auto-stop before the candidate has said anything', () => {
        vi.useFakeTimers();
        const { result, onSilence } = setup();
        act(() => result.current.startListening());
        act(() => vi.advanceTimersByTime(10_000));
        expect(onSilence).not.toHaveBeenCalled();
        expect(result.current.isListening).toBe(true);
    });

    it('transparently restarts when the browser ends the session on its own, keeping the text', () => {
        const { result, rec, onTranscript } = setup();
        act(() => result.current.startListening());
        act(() => rec().emit([{ text: 'first part', final: true }]));
        act(() => rec().endBySystem());
        expect(rec().start).toHaveBeenCalledTimes(2);
        expect(result.current.isListening).toBe(true);

        act(() => rec().emit([{ text: 'second part', final: true }])); // new session → results restart at 0
        expect(onTranscript).toHaveBeenLastCalledWith('first part second part');
    });

    it('manual stop does not trigger onSilence', () => {
        vi.useFakeTimers();
        const { result, rec, onSilence } = setup();
        act(() => result.current.startListening());
        act(() => rec().emit([{ text: 'half an answer', final: false }]));
        act(() => result.current.stopListening());
        act(() => vi.advanceTimersByTime(5000));
        expect(onSilence).not.toHaveBeenCalled();
        expect(result.current.isListening).toBe(false);
    });

    it('surfaces mic-permission denial as an error and stops', () => {
        const { result, rec } = setup();
        act(() => result.current.startListening());
        act(() => rec().fail('not-allowed'));
        expect(result.current.error.code).toBe('not-allowed');
        expect(result.current.error.message).toMatch(/Microphone access is blocked/);
        expect(result.current.micPermission).toBe('denied');
        expect(result.current.isListening).toBe(false);
        expect(rec().start).toHaveBeenCalledTimes(1); // no restart loop after a fatal error
    });

    it("ignores Chrome's 'no-speech' timeout (keeps listening)", () => {
        const { result, rec } = setup();
        act(() => result.current.startListening());
        act(() => rec().fail('no-speech'));
        expect(result.current.error).toBeNull();
        expect(rec().start).toHaveBeenCalledTimes(2);
    });
});

describe('useSpeech — speaking', () => {
    it('speak() resolves when the utterance ends and toggles isSpeaking', async () => {
        const { result } = setup();
        let done = false;
        let promise;
        act(() => {
            promise = result.current.speak('Tell me about a project you led.').then(() => (done = true));
        });
        expect(result.current.isSpeaking).toBe(true);
        expect(window.speechSynthesis.spoken).toEqual(['Tell me about a project you led.']);

        await act(async () => {
            window.speechSynthesis.finishAll();
            await promise;
        });
        expect(done).toBe(true);
        expect(result.current.isSpeaking).toBe(false);
    });

    it('speaks long text in sentence chunks', async () => {
        const long = Array.from({ length: 6 }, (_, i) => `This is sentence number ${i + 1} of a long reply, with extra words.`).join(' ');
        const chunks = splitForSpeech(long);
        expect(chunks.length).toBeGreaterThan(1);
        expect(chunks.every((c) => c.length <= 200)).toBe(true);

        const { result } = setup();
        let promise;
        act(() => {
            promise = result.current.speak(long);
        });
        await act(async () => {
            window.speechSynthesis.finishAll();
            await promise;
        });
        expect(window.speechSynthesis.spoken).toEqual(chunks);
    });

    it('always settles even if the engine never fires `end`', async () => {
        vi.useFakeTimers();
        const { result } = setup();
        let done = false;
        act(() => {
            result.current.speak('Short question?').then(() => (done = true));
        });
        await act(async () => {
            vi.advanceTimersByTime(4000);
        });
        expect(done).toBe(true);
        expect(result.current.isSpeaking).toBe(false);
    });

    it('stops listening before speaking (never transcribe the AI)', () => {
        const { result, rec } = setup();
        act(() => result.current.startListening());
        act(() => {
            result.current.speak('Next question.');
        });
        expect(rec().stop).toHaveBeenCalled();
    });

    it('startListening while speaking interrupts the AI (barge-in)', async () => {
        const { result } = setup();
        let promise;
        act(() => {
            promise = result.current.speak('A long question that the candidate interrupts.');
        });
        act(() => result.current.startListening());
        await act(async () => promise);
        expect(window.speechSynthesis.cancel).toHaveBeenCalled();
        expect(result.current.isSpeaking).toBe(false);
        expect(result.current.isListening).toBe(true);
    });
});

describe('useSpeech — microphone permission', () => {
    it('returns true and marks granted', async () => {
        const { result } = setup();
        let ok;
        await act(async () => {
            ok = await result.current.requestMicPermission();
        });
        expect(ok).toBe(true);
        expect(result.current.micPermission).toBe('granted');
    });

    it('returns false with a readable error when denied', async () => {
        navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(Object.assign(new Error('denied'), { name: 'NotAllowedError' }));
        const { result } = setup();
        let ok;
        await act(async () => {
            ok = await result.current.requestMicPermission();
        });
        expect(ok).toBe(false);
        expect(result.current.micPermission).toBe('denied');
        expect(result.current.error.code).toBe('not-allowed');
    });

    it('reports a missing microphone', async () => {
        navigator.mediaDevices.getUserMedia.mockRejectedValueOnce(Object.assign(new Error('none'), { name: 'NotFoundError' }));
        const { result } = setup();
        await act(async () => {
            await result.current.requestMicPermission();
        });
        expect(result.current.error.code).toBe('audio-capture');
    });
});
