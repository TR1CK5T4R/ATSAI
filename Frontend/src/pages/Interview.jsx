import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMic, FiMicOff, FiSend, FiXCircle, FiPlayCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { interviewApi } from '../api/interview.api'; 
import useSpeech from '../hooks/useSpeech';
import AIAvatar from '../components/chat/AIAvatar';
import ChatMessage from '../components/chat/ChatMessage';

const Interview = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const roleApplied = state?.roleApplied || 'Senior Full Stack Developer';

    const [sessionId, setSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [inputText, setInputText] = useState('');
    const [hasStarted, setHasStarted] = useState(false);

    const bottomRef = useRef(null);
    const inputTextRef = useRef(inputText);
    const isLoadingRef = useRef(isLoading);

    useEffect(() => { inputTextRef.current = inputText; }, [inputText]);
    useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);

    const handleSend = useCallback(async (textToSubmit) => {
        const text = textToSubmit || inputTextRef.current;
        if (!text.trim() || isLoadingRef.current) return;

        const userMsg = { role: 'user', content: text, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setTranscript('');
        setIsLoading(true);
        stopListening();

        try {
            const response = await interviewApi.submitAnswer(sessionId, userMsg.content);
            const { nextQuestion, analysis } = response.data;

            const aiMsg = {
                role: 'ai',
                content: nextQuestion,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMsg]);
            speak(nextQuestion);
        } catch (error) {
            toast.error('Failed to get response');
            setIsLoading(false);
        }
    }, [sessionId]);

    const handleSilence = useCallback(() => {
        if (inputTextRef.current.trim() && !isLoadingRef.current) {
            handleSend();
        }
    }, [handleSend]);

    const handleSpeakEnd = useCallback(() => {
        startListening();
    }, []);

    const { 
        isListening, 
        transcript, 
        isSpeaking, 
        permissionGranted, 
        silenceTimeLeft, 
        requestPermission, 
        startListening, 
        stopListening, 
        speak, 
        setTranscript 
    } = useSpeech({
        onSilence: handleSilence,
        onSpeakEnd: handleSpeakEnd,
        silenceTimeout: 5000
    });

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isSpeaking, isLoading]);

    useEffect(() => {
        if (transcript) setInputText(transcript);
    }, [transcript]);

    const initSession = async () => {
        const granted = await requestPermission();
        if (!granted) return;
        
        setHasStarted(true);
        try {
            setIsLoading(true);
            const response = await interviewApi.startInterview(roleApplied);
            const { sessionId: newSessionId, question } = response.data;

            setSessionId(newSessionId);

            const initialMsg = {
                role: 'ai',
                content: question,
                timestamp: new Date()
            };

            setMessages([initialMsg]);
            speak(question);
        } catch (error) {
            toast.error('Failed to start interview');
            navigate('/dashboard');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEndInterview = async () => {
        try {
            stopListening();
            if (sessionId) {
                await interviewApi.completeInterview(sessionId);
            }
            toast.success('Interview Completed!');
            navigate('/results', { state: { sessionId } });
        } catch (error) {
            toast.error('Error ending interview');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Full screen overlay layout to escape the parent container padding/max-width
    if (!hasStarted || !permissionGranted) {
        return (
            <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full bg-surface border border-border rounded-2xl p-8 text-center shadow-2xl"
                >
                    <div className="w-16 h-16 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
                        <FiMic className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold mb-4">Ready to Start?</h2>
                    <p className="text-muted mb-8">
                        The AI will conduct a voice interview for the role of <strong>{roleApplied}</strong>. 
                        Please ensure you are in a quiet environment and grant microphone permissions when prompted.
                    </p>
                    <button
                        onClick={initSession}
                        className="w-full py-3 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all"
                    >
                        <FiPlayCircle className="w-5 h-5" /> Start Interview
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-background flex flex-col max-w-4xl mx-auto shadow-2xl border-x border-white/5">
            {/* Header / Avatar Area */}
            <div className="flex flex-col items-center justify-center py-6 border-b border-white/5 bg-background/50 backdrop-blur-sm z-10 shrink-0">
                <AIAvatar isSpeaking={isSpeaking} isThinking={isLoading} />
                <h2 className="text-sm font-medium text-muted tracking-wide">
                    Interviewing for <span className="text-white">{roleApplied}</span>
                </h2>
                <button
                    onClick={handleEndInterview}
                    className="absolute right-4 top-6 text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-3 py-1.5 rounded-full border border-red-500/20 hover:bg-red-500/10 transition-colors"
                >
                    <FiXCircle /> End Session
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-hide">
                <AnimatePresence>
                    {messages.map((msg, idx) => (
                        <ChatMessage key={idx} message={msg} />
                    ))}

                    {isLoading && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex items-center gap-2 text-muted text-sm ml-12"
                        >
                            <div className="flex gap-1">
                                {[0, 1, 2].map(i => (
                                    <motion.div
                                        key={i}
                                        animate={{ y: [0, -5, 0] }}
                                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                                        className="w-1.5 h-1.5 bg-accent rounded-full"
                                    />
                                ))}
                            </div>
                            AI is thinking...
                        </motion.div>
                    )}
                </AnimatePresence>
                <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-surface border-t border-white/5 mx-4 mb-4 rounded-2xl shadow-2xl relative z-20 shrink-0">
                {isListening && transcript && !isLoading && (
                    <div className="absolute -top-8 left-0 right-0 flex justify-center">
                        <div className="bg-primary/20 border border-primary/30 text-primary text-xs px-3 py-1 rounded-full animate-pulse flex items-center gap-2">
                            <span>Auto-submitting in {silenceTimeLeft}s</span>
                            <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        </div>
                    </div>
                )}
                
                <div className="flex items-end gap-3">
                    <button
                        onClick={isListening ? stopListening : startListening}
                        disabled={isLoading || isSpeaking}
                        className={`p-3 rounded-full transition-all disabled:opacity-50 ${
                            isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-white/5 text-muted hover:text-white'
                        }`}
                    >
                        {isListening ? <FiMicOff /> : <FiMic />}
                    </button>

                    <div className="flex-1 relative">
                        <textarea
                            value={inputText}
                            onChange={(e) => {
                                setInputText(e.target.value);
                                setTranscript(e.target.value); // Sync manual typing
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your answer or speak..."
                            className="w-full bg-transparent text-text placeholder-muted resize-none outline-none py-3 max-h-32"
                            rows={1}
                            disabled={isLoading || isSpeaking}
                        />
                    </div>

                    <button
                        onClick={() => handleSend()}
                        disabled={!inputText.trim() || isLoading || isSpeaking}
                        className="p-3 bg-primary text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                    >
                        <FiSend />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Interview;
