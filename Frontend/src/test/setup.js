/**
 * Vitest setup — installs the Web Speech fakes BEFORE app modules load
 * (useSpeech detects support at import time).
 */

import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { FakeRecognition, FakeUtterance, createFakeSynth } from './speechFakes';

window.webkitSpeechRecognition = FakeRecognition;
window.SpeechSynthesisUtterance = FakeUtterance;
window.speechSynthesis = createFakeSynth();

beforeEach(() => {
    FakeRecognition.instances = [];
    window.speechSynthesis = createFakeSynth();
    Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }) },
    });
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});
