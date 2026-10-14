/**
 * Interview.jsx — Real-time voice mock interview
 *
 * Flow: start screen → POST /interview/create (8 tailored questions) → the AI
 * speaks each question (speechSynthesis) → the candidate answers by voice
 * (SpeechRecognition, auto-submit after silence) or by typing → POST /:id/answer
 * returns a follow-up or the next question → after the closing line, Finish
 * evaluates the transcript and opens the report.
 *
 * Browsers without SpeechRecognition (or a denied mic) fall back to typing.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMic, FiMicOff, FiSend, FiPlayCircle, FiFlag, FiType } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { interviewApi } from '../api/interview.api';
import { resumeApi } from '../api/resume.api';
import useSpeech from '../hooks/useSpeech';
import AIAvatar from '../components/chat/AIAvatar';
import ChatMessage from '../components/chat/ChatMessage';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';

const speechRecognitionSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

const Interview = () => {
    const { state } = useLocation();
    const navigate = useNavigate();

    const [interviewId, setInterviewId] = useState(null);
    const [targetRole, setTargetRole] = useState('');
    const [progress, setProgress] = useState({ current: 1, total: 8 });
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [phase, setPhase] = useState('intro'); // intro | starting | live | done | finishing
    const [isLoading, setIsLoading] = useState(false);
    const [voiceMode, setVoiceMode] = useState(false);

    const bottomRef = useRef(null);
    // Refs mirror state for the speech callbacks, which fire outside React's render cycle
    const inputRef = useRef('');
    const busyRef = useRef(false);
    const phaseRef = useRef(phase);
    const voiceRef = useRef(false);
    const sendRef = useRef(() => {});

    useEffect(() => { inputRef.current = inputText; }, [inputText]);
    useEffect(() => { busyRef.current = isLoading; }, [isLoading]);
    useEffect(() => { phaseRef.current = phase; }, [phase]);
    useEffect(() => { voiceRef.current = voiceMode; }, [voiceMode]);

    const speech = useSpeech({
        silenceTimeout: 5000,
        // Auto-submit after the candidate stops talking
        onSilence: () => {
            if (inputRef.current.trim() && !busyRef.current) sendRef.current();
        },
        // Listen again once the AI has finished speaking (not after the closing line)
        onSpeakEnd: () => {
            if (voiceRef.current && phaseRef.current === 'live') speech.startListening();
        },
    });
    const { isListening, transcript, isSpeaking, silenceTimeLeft, setTranscript } = speech;

    useEffect(() => {
        if (transcript) setInputText(transcript);
    }, [transcript]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Stop speech when leaving the page
    useEffect(() => () => {
        speech.stopListening();
        speech.cancelSpeech();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const addMessage = (role, content) => setMessages((prev) => [...prev, { role, content, timestamp: new Date() }]);

    const startInterview = async () => {
        setPhase('starting');
        // Voice needs both browser support and microphone permission; otherwise type
        const voice = speechRecognitionSupported && (await speech.requestPermission());
        setVoiceMode(voice);
        if (!voice) toast('Voice input unavailable — you can type your answers', { icon: '⌨️' });

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
            setInterviewId(data.id);
            setTargetRole(data.targetRole);
            setProgress({ current: data.questionNumber, total: data.totalQuestions });
            addMessage('ai', data.question.text);
            setPhase('live');
            speech.speak(data.question.text);
        } catch (err) {
            toast.error(err.message);
            setPhase('intro');
        }
    };

    const sendAnswer = useCallback(async () => {
        const text = inputRef.current.trim();
        if (!text || busyRef.current || !interviewId) return;

        speech.stopListening();
        addMessage('user', text);
        setInputText('');
        setTranscript('');
        setIsLoading(true);

        try {
            const { data } = await interviewApi.submitAnswer(interviewId, text);
            addMessage('ai', data.reply);
            setProgress({ current: data.questionNumber, total: data.totalQuestions });
            if (data.done) setPhase('done');
            speech.speak(data.reply);
        } catch (err) {
            toast.error(err.message);
            setInputText(text); // let the candidate retry without retyping
        } finally {
            setIsLoading(false);
        }
    }, [interviewId, speech, setTranscript]);

    useEffect(() => { sendRef.current = sendAnswer; }, [sendAnswer]);

    const finishInterview = async () => {
        speech.stopListening();
        speech.cancelSpeech();
        const answered = messages.some((m) => m.role === 'user');
        if (!answered) {
            if (window.confirm('You haven\'t answered any questions. Leave without a report?')) navigate('/dashboard');
            return;
        }
        setPhase('finishing');
        try {
            await interviewApi.finishInterview(interviewId);
            toast.success('Interview complete!');
            navigate(`/results?id=${interviewId}`);
        } catch (err) {
            toast.error(err.message);
            setPhase(progress.current >= progress.total ? 'done' : 'live');
        }
    };

    const onKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendAnswer();
        }
    };

    // ── Start screen ──────────────────────────────────────────────────────────
    if (phase === 'intro' || phase === 'starting') {
        return (
            <div className="max-w-lg mx-auto">
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-surface border border-border rounded-2xl p-6 sm:p-8 text-center">
                    <div className="w-16 h-16 bg-primary/15 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <FiMic className="w-7 h-7" />
                    </div>
                    <h1 className="text-2xl font-bold mb-3">Ready for your mock interview?</h1>
                    <p className="text-muted mb-2">8 questions tailored to your resume: technical, project-based and behavioral.</p>
                    <p className="text-muted text-sm mb-8">
                        Find a quiet spot and allow microphone access. You can also type your answers.
                    </p>
                    <Button size="lg" className="w-full" onClick={startInterview} loading={phase === 'starting'}>
                        {phase === 'starting' ? 'Preparing your questions…' : <><FiPlayCircle /> Start interview</>}
                    </Button>
                </motion.div>
            </div>
        );
    }

    // ── Live interview (full-screen, focused) ─────────────────────────────────
    const inputDisabled = isLoading || phase !== 'live';

    return (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col">
            {phase === 'finishing' && (
                <div className="absolute inset-0 z-30 bg-background/90 backdrop-blur flex flex-col items-center justify-center gap-3 text-center px-6">
                    <Spinner className="w-10 h-10 text-primary" />
                    <p className="font-medium">Evaluating your interview…</p>
                    <p className="text-sm text-muted">This usually takes a few seconds.</p>
                </div>
            )}

            {/* Header */}
            <header className="shrink-0 border-b border-border bg-background/80 backdrop-blur">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{targetRole || 'Mock interview'}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="h-1.5 w-28 sm:w-40 rounded-full bg-white/10 overflow-hidden">
                                <div className="h-full bg-primary transition-all" style={{ width: `${(Math.min(progress.current, progress.total) / progress.total) * 100}%` }} />
                            </div>
                            <span className="text-xs text-muted whitespace-nowrap">
                                Question {Math.min(progress.current, progress.total)} of {progress.total}
                            </span>
                        </div>
                    </div>
                    <Button variant={phase === 'done' ? 'primary' : 'danger'} size="sm" onClick={finishInterview}>
                        <FiFlag /> {phase === 'done' ? 'See report' : 'Finish'}
                    </Button>
                </div>
            </header>

            {/* Avatar */}
            <div className="shrink-0 pt-6 pb-2">
                <AIAvatar isSpeaking={isSpeaking} isThinking={isLoading} />
            </div>

            {/* Transcript */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col">
                    <AnimatePresence initial={false}>
                        {messages.map((msg, idx) => <ChatMessage key={idx} message={msg} />)}
                    </AnimatePresence>
                    {isLoading && (
                        <div className="flex items-center gap-2 text-muted text-sm ml-12 mb-6">
                            <Spinner className="w-3.5 h-3.5" /> Interviewer is thinking…
                        </div>
                    )}
                    {phase === 'done' && (
                        <div className="self-center mt-2 mb-6 text-center">
                            <Button size="lg" onClick={finishInterview}><FiFlag /> Finish & see my report</Button>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>
            </div>

            {/* Composer */}
            <div className="shrink-0 border-t border-border bg-surface/80 backdrop-blur pb-[env(safe-area-inset-bottom)]">
                <div className="max-w-3xl mx-auto px-4 py-3 relative">
                    {isListening && inputText && !isLoading && (
                        <div className="absolute -top-9 inset-x-0 flex justify-center pointer-events-none">
                            <span className="bg-primary/15 border border-primary/30 text-primary text-xs px-3 py-1 rounded-full">
                                Sending in {silenceTimeLeft}s…
                            </span>
                        </div>
                    )}
                    <div className="flex items-end gap-2">
                        {voiceMode ? (
                            <button
                                onClick={isListening ? speech.stopListening : speech.startListening}
                                disabled={inputDisabled || isSpeaking}
                                aria-label={isListening ? 'Stop listening' : 'Start listening'}
                                className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 ${
                                    isListening ? 'bg-danger/15 text-danger animate-pulse' : 'bg-white/5 text-muted hover:text-text'
                                }`}
                            >
                                {isListening ? <FiMicOff /> : <FiMic />}
                            </button>
                        ) : (
                            <span className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-white/5 text-muted" title="Typing mode">
                                <FiType />
                            </span>
                        )}
                        <textarea
                            value={inputText}
                            onChange={(e) => {
                                setInputText(e.target.value);
                                setTranscript(e.target.value);
                            }}
                            onKeyDown={onKeyDown}
                            placeholder={phase === 'done' ? 'All questions answered' : voiceMode ? 'Speak or type your answer…' : 'Type your answer…'}
                            aria-label="Your answer"
                            rows={1}
                            disabled={inputDisabled}
                            className="flex-1 min-h-11 max-h-32 resize-none bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/60 disabled:opacity-50"
                        />
                        <Button className="shrink-0 w-11 px-0" onClick={sendAnswer} disabled={!inputText.trim() || inputDisabled} aria-label="Send answer">
                            <FiSend />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Interview;
