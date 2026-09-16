/**
 * Interview.jsx — Real-time voice mock interview
 *
 * Turn loop:  AI speaks the question → mic auto-listens → ~1.5 s of silence
 *             → answer sent to POST /interview/:id/answer → AI speaks the reply → …
 * After the closing line the candidate ends the interview and gets the report.
 *
 * Fallbacks: no SpeechRecognition (e.g. Firefox), denied mic or a recognition
 * error mid-session → typed answers (the AI still speaks if speechSynthesis exists).
 * Clicking the mic while the AI talks interrupts it (barge-in).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMic, FiMicOff, FiSend, FiPlayCircle, FiFlag, FiAlertTriangle, FiRefreshCw, FiType } from 'react-icons/fi';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { interviewApi } from '../api/interview.api';
import { resumeApi } from '../api/resume.api';
import useSpeech, { SPEECH_SUPPORT } from '../hooks/useSpeech';
import AIAvatar from '../components/chat/AIAvatar';
import ChatMessage from '../components/chat/ChatMessage';
import LatencyBadge from '../components/chat/LatencyBadge';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';

const SILENCE_MS = 1500;

const TEXT_MODE_REASONS = {
    unsupported: 'Voice input isn’t supported in this browser (try Chrome, Edge or Safari) — type your answers instead.',
    denied: 'Microphone access was denied. Type your answers, or allow the mic in your browser settings and tap the mic button.',
};

let messageSeq = 0;
const makeMessage = (role, content, extra = {}) => ({ id: ++messageSeq, role, content, timestamp: new Date(), ...extra });

const MicButton = ({ listening, disabled, onClick, title }) => (
    <div className="relative shrink-0">
        {listening &&
            [0, 0.6].map((delay) => (
                <motion.span
                    key={delay}
                    className="absolute inset-0 rounded-full bg-danger/40"
                    initial={{ scale: 1, opacity: 0.7 }}
                    animate={{ scale: 1.9, opacity: 0 }}
                    transition={{ duration: 1.2, repeat: Infinity, delay, ease: 'easeOut' }}
                />
            ))}
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            aria-label={title}
            aria-pressed={listening}
            className={clsx(
                'relative w-12 h-12 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                listening ? 'bg-danger text-white' : 'bg-white/10 text-text hover:bg-white/15'
            )}
        >
            {listening ? <FiMicOff className="w-5 h-5" /> : <FiMic className="w-5 h-5" />}
        </button>
    </div>
);

const Interview = () => {
    const { state } = useLocation();
    const navigate = useNavigate();

    const [phase, setPhase] = useState('intro'); // intro | starting | live | done | finishing
    const [targetRole, setTargetRole] = useState('');
    const [progress, setProgress] = useState({ current: 1, total: 8 });
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [busy, setBusy] = useState(false);
    const [mode, setMode] = useState('voice'); // voice | text
    const [textReason, setTextReason] = useState(null);
    const [latency, setLatency] = useState(null); // { total, server }
    const [failedAnswer, setFailedAnswer] = useState(null);

    // Refs mirror state for speech callbacks, which fire outside React's render cycle
    const phaseRef = useRef(phase);
    const modeRef = useRef(mode);
    const busyRef = useRef(false);
    const idRef = useRef(null);
    const submitRef = useRef(() => {});
    const bottomRef = useRef(null);

    const goTo = (next) => {
        phaseRef.current = next;
        setPhase(next);
    };
    const setInputMode = (next, reason = null) => {
        modeRef.current = next;
        setMode(next);
        setTextReason(reason);
    };
    const setBusyBoth = (value) => {
        busyRef.current = value;
        setBusy(value);
    };

    const speech = useSpeech({
        silenceMs: SILENCE_MS,
        onTranscript: (text) => setDraft(text),
        onSilence: (text) => submitRef.current(text),
    });
    const { speak, startListening, stopListening, cancelSpeech } = speech;

    const voiceActive = mode === 'voice' && !speech.error;

    useEffect(() => {
        bottomRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'end' });
    }, [messages, busy]);

    // Warn before a reload/close would abandon a running interview
    useEffect(() => {
        if (phase !== 'live' && phase !== 'done') return undefined;
        const warn = (e) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [phase]);

    /** Speak, then hand the floor back to the candidate (voice mode only) */
    const speakThenListen = useCallback(
        async (text) => {
            await speak(text);
            if (phaseRef.current === 'live' && modeRef.current === 'voice' && !busyRef.current) startListening();
        },
        [speak, startListening]
    );

    // ── Start ─────────────────────────────────────────────────────────────────
    const startInterview = async () => {
        goTo('starting');

        if (!SPEECH_SUPPORT.recognition) setInputMode('text', 'unsupported');
        else if (await speech.requestMicPermission()) setInputMode('voice');
        else setInputMode('text', 'denied');

        try {
            let resumeId = state?.resumeId;
            if (!resumeId) {
                const mine = await resumeApi.getMyResume();
                resumeId = mine.data?.[0]?.id;
            }
            if (!resumeId) {
                toast.error('Upload your resume first');
                navigate('/resume');
                return;
            }

            const { data } = await interviewApi.createInterview(resumeId);
            idRef.current = data.id;
            setTargetRole(data.targetRole);
            setProgress({ current: data.questionNumber, total: data.totalQuestions });
            setMessages([makeMessage('ai', data.question.text, { kind: 'question' })]);
            goTo('live');
            speakThenListen(data.question.text);
        } catch (err) {
            toast.error(err.message);
            goTo('intro');
        }
    };

    // ── Answer ────────────────────────────────────────────────────────────────
    const submitAnswer = useCallback(
        async (rawText) => {
            const text = String(rawText ?? '').trim();
            if (!text || busyRef.current || phaseRef.current !== 'live') return;

            stopListening();
            const userMessage = makeMessage('user', text);
            setMessages((prev) => [...prev, userMessage]);
            setDraft('');
            setFailedAnswer(null);
            setBusyBoth(true);

            const startedAt = performance.now();
            try {
                const { data } = await interviewApi.submitAnswer(idRef.current, text);
                const total = Math.round(performance.now() - startedAt);
                setLatency({ total, server: data.latencyMs });
                setMessages((prev) => [...prev, makeMessage('ai', data.reply, { kind: data.kind, latencyMs: total })]);
                setProgress({ current: data.questionNumber, total: data.totalQuestions });
                setBusyBoth(false);

                if (data.done) {
                    goTo('done');
                    speak(data.reply);
                } else {
                    speakThenListen(data.reply);
                }
            } catch (err) {
                setBusyBoth(false);
                if (err.status === 409) {
                    // Already answered/finished server-side — move to the end state
                    toast(err.message);
                    goTo('done');
                    return;
                }
                // Undo the optimistic bubble and keep the text so nothing is lost
                setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
                setDraft(text);
                setFailedAnswer(text);
                toast.error(err.message);
            }
        },
        [speak, speakThenListen, stopListening]
    );

    useEffect(() => {
        submitRef.current = submitAnswer;
    }, [submitAnswer]);

    // ── Mic ───────────────────────────────────────────────────────────────────
    const toggleMic = async () => {
        if (mode === 'text' || speech.error) {
            // Retry voice after the user fixed permissions / the network
            if (!SPEECH_SUPPORT.recognition) return;
            if (!(await speech.requestMicPermission())) return;
            setInputMode('voice');
            setDraft('');
            startListening();
            return;
        }
        if (speech.isListening) stopListening();
        else startListening(); // also interrupts the AI if it is speaking
    };

    // ── End ───────────────────────────────────────────────────────────────────
    const endInterview = async () => {
        const answered = messages.some((m) => m.role === 'user');
        if (!answered) {
            if (!window.confirm("You haven't answered any questions yet. Leave without a report?")) return;
            stopListening();
            cancelSpeech();
            navigate('/dashboard');
            return;
        }
        if (phase !== 'done' && !window.confirm('End the interview now? Your report will be based on the answers so far.')) return;

        stopListening();
        cancelSpeech();
        const previous = phaseRef.current;
        goTo('finishing');
        try {
            await interviewApi.finishInterview(idRef.current);
            toast.success('Interview complete!');
            navigate(`/results?id=${idRef.current}`);
        } catch (err) {
            toast.error(err.message);
            goTo(previous);
        }
    };

    // ── Intro screen ──────────────────────────────────────────────────────────
    if (phase === 'intro' || phase === 'starting') {
        return (
            <div className="max-w-lg mx-auto">
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-surface border border-border rounded-2xl p-6 sm:p-8 text-center">
                    <div className="mb-8 mt-2">
                        <AIAvatar state={phase === 'starting' ? 'thinking' : 'idle'} />
                    </div>
                    <h1 className="text-2xl font-bold mb-3">Ready for your mock interview?</h1>
                    <p className="text-muted mb-2">8 questions tailored to your resume: technical, project-based and behavioral.</p>
                    <ul className="text-sm text-muted text-left space-y-1.5 my-6 bg-white/[0.03] border border-border rounded-xl p-4">
                        <li>• The interviewer speaks each question, then listens.</li>
                        <li>• Pause for about {SILENCE_MS / 1000} seconds when you finish — your answer is sent automatically.</li>
                        <li>• Tap the mic to interrupt or to stop listening; you can always type instead.</li>
                    </ul>
                    {!SPEECH_SUPPORT.recognition && (
                        <p className="flex items-start gap-2 text-left text-sm text-warning bg-warning/10 border border-warning/20 rounded-xl p-3 mb-6">
                            <FiType className="mt-0.5 shrink-0" /> {TEXT_MODE_REASONS.unsupported}
                        </p>
                    )}
                    <Button size="lg" className="w-full" onClick={startInterview} loading={phase === 'starting'}>
                        {phase === 'starting' ? 'Preparing your questions…' : <><FiPlayCircle /> Start interview</>}
                    </Button>
                </motion.div>
            </div>
        );
    }

    // ── Live interview (full-screen focus mode) ───────────────────────────────
    const avatarState = busy ? 'thinking' : speech.isSpeaking ? 'speaking' : speech.isListening ? 'listening' : 'idle';
    const questionNo = Math.min(progress.current, progress.total);
    const canAnswer = phase === 'live' && !busy;
    const banner = speech.error?.message || (mode === 'text' && TEXT_MODE_REASONS[textReason]);

    return (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col">
            {phase === 'finishing' && (
                <div className="absolute inset-0 z-30 bg-background/90 backdrop-blur flex flex-col items-center justify-center gap-3 text-center px-6">
                    <Spinner className="w-10 h-10 text-primary" />
                    <p className="font-medium">Evaluating your interview…</p>
                    <p className="text-sm text-muted">This usually takes a few seconds.</p>
                </div>
            )}

            {/* Header: role, question counter, latency, end */}
            <header className="shrink-0 border-b border-border bg-background/80 backdrop-blur">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{targetRole || 'Mock interview'}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="h-1.5 w-24 sm:w-40 rounded-full bg-white/10 overflow-hidden" role="progressbar" aria-valuemin={1} aria-valuemax={progress.total} aria-valuenow={questionNo}>
                                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(questionNo / progress.total) * 100}%` }} />
                            </div>
                            <span className="text-xs text-muted whitespace-nowrap">
                                {phase === 'done' ? 'All questions answered' : `Question ${questionNo} of ${progress.total}`}
                            </span>
                        </div>
                    </div>
                    {latency && (
                        <div className="hidden sm:flex flex-col items-end text-xs leading-tight">
                            <span className="text-muted">Last reply</span>
                            <LatencyBadge ms={latency.total} title={`Round trip ${latency.total} ms · AI ${latency.server} ms`} />
                        </div>
                    )}
                    <Button variant={phase === 'done' ? 'primary' : 'danger'} size="sm" onClick={endInterview}>
                        <FiFlag /> {phase === 'done' ? 'See report' : 'End interview'}
                    </Button>
                </div>
            </header>

            {/* Avatar */}
            <div className="shrink-0 pt-6 pb-5 flex flex-col items-center gap-2">
                <AIAvatar state={avatarState} size={88} />
                {latency && (
                    <span className="sm:hidden text-xs text-muted flex items-center gap-1 mt-3">
                        Last reply <LatencyBadge ms={latency.total} compact />
                    </span>
                )}
            </div>

            {/* Transcript */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col">
                    <AnimatePresence initial={false}>
                        {messages.map((msg) => (
                            <ChatMessage key={msg.id} message={msg} />
                        ))}
                    </AnimatePresence>
                    {busy && (
                        <div className="flex items-center gap-2 text-muted text-sm ml-11 mb-5">
                            <Spinner className="w-3.5 h-3.5" /> Interviewer is thinking…
                        </div>
                    )}
                    {phase === 'done' && (
                        <div className="self-center mt-2 mb-6">
                            <Button size="lg" onClick={endInterview}>
                                <FiFlag /> Finish & see my report
                            </Button>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>
            </div>

            {/* Composer */}
            <div className="shrink-0 border-t border-border bg-surface/80 backdrop-blur pb-[env(safe-area-inset-bottom)]">
                <div className="max-w-3xl mx-auto px-4 py-3 space-y-2">
                    {banner && (
                        <p className="flex items-start gap-2 text-xs text-warning bg-warning/10 border border-warning/20 rounded-lg px-3 py-2" role="status">
                            <FiAlertTriangle className="mt-0.5 shrink-0" /> {banner}
                        </p>
                    )}
                    {failedAnswer && !busy && (
                        <div className="flex items-center justify-between gap-2 text-xs text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                            <span>Your answer wasn’t sent.</span>
                            <Button variant="ghost" size="sm" onClick={() => submitAnswer(draft || failedAnswer)}>
                                <FiRefreshCw /> Retry
                            </Button>
                        </div>
                    )}
                    {voiceActive && speech.isListening && (
                        <p className="text-xs text-secondary text-center" aria-live="polite">
                            Listening… pause for a moment to send
                        </p>
                    )}

                    <div className="flex items-end gap-2">
                        <MicButton
                            listening={voiceActive && speech.isListening}
                            disabled={!SPEECH_SUPPORT.recognition || !canAnswer}
                            onClick={toggleMic}
                            title={
                                !SPEECH_SUPPORT.recognition
                                    ? 'Voice input not supported in this browser'
                                    : speech.isListening
                                        ? 'Stop listening'
                                        : speech.isSpeaking
                                            ? 'Interrupt and answer'
                                            : mode === 'text' || speech.error
                                                ? 'Try voice input again'
                                                : 'Start listening'
                            }
                        />
                        <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    submitAnswer(draft);
                                }
                            }}
                            readOnly={voiceActive && speech.isListening}
                            disabled={!canAnswer}
                            rows={1}
                            aria-label="Your answer"
                            placeholder={phase === 'done' ? 'All questions answered' : voiceActive ? 'Speak, or type your answer…' : 'Type your answer…'}
                            className="flex-1 min-h-12 max-h-32 resize-none bg-background border border-border rounded-xl px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/60 disabled:opacity-50"
                        />
                        <Button className="shrink-0 w-12 h-12 px-0" onClick={() => submitAnswer(draft)} disabled={!draft.trim() || !canAnswer} aria-label="Send answer">
                            <FiSend />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Interview;
