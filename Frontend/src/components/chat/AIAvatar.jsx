import React from 'react';
import { motion } from 'framer-motion';

const AIAvatar = ({ isSpeaking, isThinking }) => {
    return (
        <div className="relative w-24 h-24 mx-auto mb-6">
            {/* Outer Glow Ring */}
            <motion.div
                animate={{
                    scale: isSpeaking ? [1, 1.2, 1] : 1,
                    opacity: isSpeaking ? [0.5, 0.8, 0.5] : 0.3,
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute inset-0 rounded-full blur-xl ${isThinking ? 'bg-accent/50' : 'bg-primary/50'}`}
            />

            {/* Core Avatar */}
            <div className="relative w-full h-full rounded-full bg-surface border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl z-10">
                <div className={`w-full h-full opacity-80 ${isThinking ? 'bg-accent/20' : 'bg-primary/20'}`}>
                    {/* Abstract Neural Network Visual */}
                    <svg viewBox="0 0 100 100" className="w-full h-full p-2">
                        <motion.path
                            d="M50 20 Q80 50 50 80 Q20 50 50 20"
                            stroke={isThinking ? '#8b5cf6' : '#3b82f6'}
                            strokeWidth="2"
                            fill="none"
                            animate={{
                                d: isSpeaking
                                    ? "M50 10 Q90 50 50 90 Q10 50 50 10" // Expanded state
                                    : "M50 20 Q80 50 50 80 Q20 50 50 20"  // Normal state
                            }}
                            transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                        />
                        <motion.circle
                            cx="50" cy="50" r="10"
                            fill={isThinking ? '#8b5cf6' : '#3b82f6'}
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                    </svg>
                </div>
            </div>

            {/* Status Indicator */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20">
                <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-black/50 backdrop-blur-sm border ${isThinking ? 'border-accent text-accent' : isSpeaking ? 'border-primary text-primary' : 'border-muted text-muted'
                        }`}
                >
                    {isThinking ? 'Thinking...' : isSpeaking ? 'Speaking' : 'Ready'}
                </motion.div>
            </div>
        </div>
    );
};

export default AIAvatar;
