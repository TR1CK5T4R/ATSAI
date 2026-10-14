/**
 * speechFakes.js — Controllable stand-ins for the Web Speech API (jsdom has none).
 * Tests drive them explicitly: emit recognition results, finish an utterance, etc.
 */

import { vi } from 'vitest';

export class FakeRecognition {
    static instances = [];

    static latest() {
        return FakeRecognition.instances[FakeRecognition.instances.length - 1];
    }

    constructor() {
        this.running = false;
        this.start = vi.fn(() => {
            if (this.running) throw new Error('InvalidStateError: already started');
            this.running = true;
            this.onstart?.();
        });
        this.stop = vi.fn(() => {
            if (!this.running) return;
            this.running = false;
            this.onend?.();
        });
        this.abort = vi.fn(() => {
            this.running = false;
        });
        FakeRecognition.instances.push(this);
    }

    /** Emit results like Chrome: cumulative list, `resultIndex` = first changed result */
    emit(results, resultIndex = 0) {
        const list = results.map(({ text, final }) => Object.assign([{ transcript: text }], { isFinal: Boolean(final) }));
        this.onresult?.({ resultIndex, results: list });
    }

    /** Browser-initiated end (Chrome's silence / time limit) */
    endBySystem() {
        this.running = false;
        this.onend?.();
    }

    fail(error) {
        this.onerror?.({ error });
        this.running = false;
        this.onend?.();
    }
}

export const createFakeSynth = () => {
    const synth = {
        speaking: false,
        current: null,
        spoken: [],
        getVoices: () => [],
        resume: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        speak: vi.fn((utterance) => {
            synth.current = utterance;
            synth.speaking = true;
            synth.spoken.push(utterance.text);
        }),
        cancel: vi.fn(() => {
            const u = synth.current;
            synth.current = null;
            synth.speaking = false;
            u?.onerror?.({ error: 'interrupted' });
        }),
        /** Finish the current utterance (fires `end`, which may start the next chunk) */
        finishUtterance() {
            const u = synth.current;
            synth.current = null;
            synth.speaking = false;
            u?.onend?.();
        },
        /** Finish every queued chunk */
        finishAll() {
            let guard = 20;
            while (synth.current && guard--) synth.finishUtterance();
        },
    };
    return synth;
};

export class FakeUtterance {
    constructor(text) {
        this.text = text;
    }
}
