import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMic, FiMicOff, FiSend, FiXCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { interviewApi } from '../api/interview.api'; // Import Centralized API
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

    const bottomRef = useRef(null);
    const { isListening, transcript, isSpeaking, startListening, stopListening, speak, setTranscript } = useSpeech();

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isSpeaking, isLoading]);

    useEffect(() => {
        if (transcript) setInputText(transcript);
    }, [transcript]);

    useEffect(() => {
        const initSession = async () => {
            try {
                setIsLoading(true);
                // User Centralized API
                const response = await interviewApi.startInterview(roleApplied);
                // Assuming response.data is the payload
                const { sessionId, question } = response.data;

                setSessionId(sessionId);

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

        if (!sessionId) initSession();
    }, []);

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const userMsg = { role: 'user', content: inputText, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setTranscript('');
        setIsLoading(true);

        try {
            // Use Centralized API
            const response = await interviewApi.submitAnswer(sessionId, userMsg.content);
            const { nextQuestion, analysis } = response.data; // analysis might contain score for instant feedback

            const aiMsg = {
                role: 'ai',
                content: nextQuestion,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMsg]);
            speak(nextQuestion);
        } catch (error) {
            toast.error('Failed to get response');
        } finally {
            setIsLoading(false);
        }
    };

    const handleEndInterview = async () => {
        try {
            await interviewApi.completeInterview(sessionId);
            toast.success('Interview Completed!');
            navigate('/results');
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

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col max-w-4xl mx-auto relative">

            {/* Header / Avatar Area */}
            <div className="flex flex-col items-center justify-center py-6 border-b border-white/5 bg-background/50 backdrop-blur-sm z-10 sticky top-0">
                <AIAvatar isSpeaking={isSpeaking} isThinking={isLoading} />
                <h2 className="text-sm font-medium text-muted tracking-wide">
                    Interviewing for <span className="text-white">{roleApplied}</span>
                </h2>
                <button
                    onClick={handleEndInterview}
                    className="absolute right-0 top-6 text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-3 py-1.5 rounded-full border border-red-500/20 hover:bg-red-500/10 transition-colors"
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
            <div className="p-4 bg-surface border-t border-white/5 mx-4 mb-4 rounded-2xl shadow-2xl relative z-20">
                <div className="flex items-end gap-3">
                    <button
                        onClick={isListening ? stopListening : startListening}
                        className={`p-3 rounded-full transition-all ${isListening ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-white/5 text-muted hover:text-white'
                            }`}
                    >
                        {isListening ? <FiMicOff /> : <FiMic />}
                    </button>

                    <div className="flex-1 relative">
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your answer or speak..."
                            className="w-full bg-transparent text-text placeholder-muted resize-none outline-none py-3 max-h-32"
                            rows={1}
                        />
                    </div>

                    <button
                        onClick={handleSend}
                        disabled={!inputText.trim() || isLoading}
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
