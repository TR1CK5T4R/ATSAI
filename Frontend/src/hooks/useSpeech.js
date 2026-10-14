/**
 * useSpeech.js — Web Speech API wrapper for the voice interview
 *
 *   const speech = useSpeech({ silenceMs: 1500, onTranscript, onSilence });
 *
 *   speech.isSupported        { recognition, synthesis } — false → use a text input
 *   speech.startListening()   continuous + interim results; auto-stops after `silenceMs`
 *                             of silence (once something was said) and calls onSilence(text)
 *   speech.stopListening()    manual stop (does NOT call onSilence)
 *   speech.speak(text)        Promise that resolves when speaking ends (or is cancelled)
 *   speech.cancelSpeech()
 *   speech.requestMicPermission()  Promise<boolean>; updates micPermission
 *   speech.isListening / isSpeaking / micPermission ('unknown'|'granted'|'denied') / error
 *
 * Browser quirks handled here:
 *  - Chrome ends "continuous" sessions on its own (no-speech, ~60 s limit) → restarted
 *    transparently while we still want to listen; text said so far is kept.
 *  - Chrome cuts long utterances (~15 s) and sometimes never fires `onend` → text is
 *    spoken in sentence chunks and a safety timer always settles the promise.
 *  - Voices load asynchronously → picked at speak time after `voiceschanged`.
 *  - Listening while speaking would transcribe the AI's own voice → speak() stops the mic.
 * Callbacks are read from a ref, so they always see the caller's latest state.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const Recognition = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined;
const synthesisSupported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

export const SPEECH_SUPPORT = { recognition: Boolean(Recognition), synthesis: synthesisSupported };

const ERROR_MESSAGES = {
    'not-allowed': 'Microphone access is blocked. Allow it in your browser’s site settings, or type your answers.',
    'service-not-allowed': 'Speech recognition is disabled in this browser. Please type your answers.',
    'audio-capture': 'No microphone was found. Connect one, or type your answers.',
    network: 'Speech recognition needs an internet connection. Check your network, or type your answers.',
    'language-not-supported': 'Speech recognition doesn’t support this language here. Please type your answers.',
};

/** Errors that mean "voice won't work until the user changes a browser setting" */
const PERMISSION_ERRORS = new Set(['not-allowed', 'service-not-allowed']);

const PREFERRED_VOICES = ['Google US English', 'Samantha', 'Microsoft Aria Online', 'Microsoft Jenny Online', 'Google UK English Female'];

/** Split into sentence chunks ≤ ~200 chars (Chrome stops long utterances) */
export const splitForSpeech = (text) => {
    const sentences = String(text).match(/[^.!?]+[.!?]*\s*/g) || [String(text)];
    const chunks = [];
    for (const s of sentences) {
        const last = chunks[chunks.length - 1];
        if (last && last.length + s.length <= 200) chunks[chunks.length - 1] = last + s;
        else chunks.push(s);
    }
    return chunks.map((c) => c.trim()).filter(Boolean);
};

const useSpeech = ({ silenceMs = 1500, lang = 'en-US', onTranscript, onSilence } = {}) => {
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [micPermission, setMicPermission] = useState('unknown');
    const [error, setError] = useState(null); // { code, message }

    const recognitionRef = useRef(null);
    const wantListeningRef = useRef(false); // intent; survives Chrome's spontaneous `end` events
    const finalTextRef = useRef('');
    const currentTextRef = useRef('');
    const silenceTimerRef = useRef(null);
    const speakTokenRef = useRef(0);
    const voicesRef = useRef([]);
    const callbacksRef = useRef({ onTranscript, onSilence });

    useEffect(() => {
        callbacksRef.current = { onTranscript, onSilence };
    });

    const clearSilenceTimer = () => {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
    };

    // ── Recognition setup ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!Recognition) return undefined;

        const rec = new Recognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = lang;
        rec.maxAlternatives = 1;

        rec.onstart = () => setIsListening(true);

        rec.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) finalTextRef.current += `${result[0].transcript} `;
                else interim += result[0].transcript;
            }
            const text = `${finalTextRef.current}${interim}`.replace(/\s+/g, ' ').trim();
            currentTextRef.current = text;
            callbacksRef.current.onTranscript?.(text);

            // Every result restarts the silence countdown; it only runs once something was said
            clearSilenceTimer();
            if (text && wantListeningRef.current) {
                silenceTimerRef.current = setTimeout(() => {
                    if (!wantListeningRef.current) return;
                    wantListeningRef.current = false;
                    try {
                        rec.stop();
                    } catch {
                        // already stopped
                    }
                    callbacksRef.current.onSilence?.(currentTextRef.current);
                }, silenceMs);
            }
        };

        rec.onerror = (event) => {
            // 'no-speech' = Chrome's ~8 s quiet timeout; 'aborted' = we stopped it. onend handles both.
            if (event.error === 'no-speech' || event.error === 'aborted') return;
            if (PERMISSION_ERRORS.has(event.error)) setMicPermission('denied');
            wantListeningRef.current = false;
            clearSilenceTimer();
            setError({ code: event.error, message: ERROR_MESSAGES[event.error] || `Speech recognition failed (${event.error}).` });
        };

        rec.onend = () => {
            if (wantListeningRef.current) {
                try {
                    rec.start(); // resume a session Chrome ended by itself
                    return;
                } catch {
                    wantListeningRef.current = false;
                }
            }
            clearSilenceTimer();
            setIsListening(false);
        };

        recognitionRef.current = rec;
        return () => {
            wantListeningRef.current = false;
            clearSilenceTimer();
            rec.onend = null;
            rec.onresult = null;
            rec.onerror = null;
            try {
                rec.abort();
            } catch {
                // not started
            }
            recognitionRef.current = null;
        };
    }, [lang, silenceMs]);

    // ── Voices (load asynchronously in most browsers) ─────────────────────────
    useEffect(() => {
        if (!synthesisSupported) return undefined;
        const synth = window.speechSynthesis;
        const load = () => {
            voicesRef.current = synth.getVoices();
        };
        load();
        synth.addEventListener?.('voiceschanged', load);
        return () => {
            synth.removeEventListener?.('voiceschanged', load);
            // Invalidate any in-flight speak() — this is a counter, so reading the latest value is intended
            // eslint-disable-next-line react-hooks/exhaustive-deps
            speakTokenRef.current++;
            synth.cancel(); // stop talking when the page unmounts
        };
    }, []);

    // ── Listening ─────────────────────────────────────────────────────────────
    const stopListening = useCallback(() => {
        wantListeningRef.current = false;
        clearSilenceTimer();
        try {
            recognitionRef.current?.stop();
        } catch {
            // not started
        }
    }, []);

    /** @returns {boolean} false when recognition is unsupported */
    const startListening = useCallback(() => {
        const rec = recognitionRef.current;
        if (!rec) return false;
        // Never listen over our own voice (barge-in: the user interrupts the AI)
        if (synthesisSupported && window.speechSynthesis.speaking) {
            speakTokenRef.current++;
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
        finalTextRef.current = '';
        currentTextRef.current = '';
        setError(null);
        wantListeningRef.current = true;
        try {
            rec.start();
        } catch {
            // already running — keep it
        }
        return true;
    }, []);

    // ── Speaking ──────────────────────────────────────────────────────────────
    const cancelSpeech = useCallback(() => {
        speakTokenRef.current++;
        if (synthesisSupported) window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, []);

    const speak = useCallback(
        (text) =>
            new Promise((resolve) => {
                if (!synthesisSupported || !text?.trim()) {
                    resolve();
                    return;
                }
                const synth = window.speechSynthesis;
                if (wantListeningRef.current) stopListening();
                synth.cancel();

                const token = ++speakTokenRef.current;
                const chunks = splitForSpeech(text);
                const voices = voicesRef.current.length ? voicesRef.current : synth.getVoices();
                const voice =
                    PREFERRED_VOICES.map((name) => voices.find((v) => v.name.includes(name))).find(Boolean) ||
                    voices.find((v) => v.lang?.startsWith(lang.split('-')[0]));

                let settled = false;
                let safetyTimer;
                const settle = () => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(safetyTimer);
                    if (token === speakTokenRef.current) setIsSpeaking(false);
                    resolve();
                };
                // Some engines never fire `end` — always settle eventually (~130 wpm + margin)
                const words = text.trim().split(/\s+/).length;
                safetyTimer = setTimeout(settle, Math.max(4000, words * 450 + 3000));

                let index = 0;
                const speakNext = () => {
                    if (token !== speakTokenRef.current || index >= chunks.length) {
                        settle(); // finished, cancelled or replaced
                        return;
                    }
                    const utterance = new SpeechSynthesisUtterance(chunks[index++]);
                    utterance.lang = lang;
                    if (voice) utterance.voice = voice;
                    utterance.onend = speakNext;
                    utterance.onerror = (e) => (e.error === 'interrupted' || e.error === 'canceled' ? settle() : speakNext());
                    synth.speak(utterance);
                };

                setIsSpeaking(true);
                speakNext();
                synth.resume(); // Chrome occasionally starts in a paused state
            }),
        [lang, stopListening]
    );

    // ── Microphone permission ─────────────────────────────────────────────────
    const requestMicPermission = useCallback(async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            setMicPermission('denied');
            setError({ code: 'audio-capture', message: 'This browser can’t access a microphone here (HTTPS is required).' });
            return false;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((t) => t.stop());
            setMicPermission('granted');
            setError(null);
            return true;
        } catch (err) {
            const code = err?.name === 'NotFoundError' ? 'audio-capture' : 'not-allowed';
            setMicPermission(code === 'not-allowed' ? 'denied' : 'unknown');
            setError({ code, message: ERROR_MESSAGES[code] });
            return false;
        }
    }, []);

    return {
        isSupported: SPEECH_SUPPORT,
        isListening,
        isSpeaking,
        micPermission,
        error,
        startListening,
        stopListening,
        speak,
        cancelSpeech,
        requestMicPermission,
    };
};

export default useSpeech;
