/**
 * AIAvatar.jsx — Animated interviewer orb.
 * state: 'speaking' (pulsing rings) | 'listening' (green, steady glow)
 *        | 'thinking' (violet, spinning arc) | 'idle'
 */

import { motion } from 'framer-motion';
import clsx from 'clsx';

const STATES = {
    speaking: { color: '#3b82f6', ring: 'bg-primary/40', label: 'Speaking', text: 'text-primary border-primary/40' },
    listening: { color: '#10b981', ring: 'bg-secondary/40', label: 'Listening', text: 'text-secondary border-secondary/40' },
    thinking: { color: '#8b5cf6', ring: 'bg-accent/40', label: 'Thinking', text: 'text-accent border-accent/40' },
    idle: { color: '#a1a1aa', ring: 'bg-white/10', label: 'Ready', text: 'text-muted border-border' },
};

const AIAvatar = ({ state = 'idle', size = 96 }) => {
    const s = STATES[state] || STATES.idle;
    const speaking = state === 'speaking';

    return (
        <div className="relative mx-auto" style={{ width: size, height: size }} aria-live="polite" aria-label={`Interviewer is ${s.label.toLowerCase()}`}>
            {/* Expanding sound rings while speaking */}
            {speaking &&
                [0, 0.5, 1].map((delay) => (
                    <motion.span
                        key={delay}
                        className={clsx('absolute inset-0 rounded-full', s.ring)}
                        initial={{ scale: 1, opacity: 0.6 }}
                        animate={{ scale: 1.8, opacity: 0 }}
                        transition={{ duration: 1.5, repeat: Infinity, delay, ease: 'easeOut' }}
                    />
                ))}

            {/* Soft glow */}
            <motion.div
                className={clsx('absolute inset-0 rounded-full blur-xl', s.ring)}
                animate={{ opacity: state === 'idle' ? 0.3 : [0.5, 0.9, 0.5] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Core */}
            <div className="relative z-10 w-full h-full rounded-full bg-surface border border-white/10 flex items-center justify-center overflow-hidden shadow-2xl">
                <svg viewBox="0 0 100 100" className="w-full h-full p-3">
                    {state === 'thinking' ? (
                        <motion.circle
                            cx="50" cy="50" r="30" fill="none" stroke={s.color} strokeWidth="4" strokeLinecap="round" strokeDasharray="60 130"
                            animate={{ rotate: 360 }}
                            style={{ originX: '50px', originY: '50px' }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                    ) : (
                        <motion.path
                            stroke={s.color}
                            strokeWidth="3"
                            fill="none"
                            animate={{
                                d: speaking
                                    ? ['M50 15 Q85 50 50 85 Q15 50 50 15', 'M50 8 Q92 50 50 92 Q8 50 50 8']
                                    : 'M50 20 Q80 50 50 80 Q20 50 50 20',
                            }}
                            transition={{ duration: 0.35, repeat: speaking ? Infinity : 0, repeatType: 'reverse' }}
                        />
                    )}
                    <motion.circle
                        cx="50" cy="50" r="10" fill={s.color}
                        animate={{ scale: state === 'listening' ? [1, 1.25, 1] : [1, 1.08, 1] }}
                        transition={{ duration: state === 'listening' ? 1 : 2, repeat: Infinity }}
                    />
                </svg>
            </div>

            {/* Status pill */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20">
                <span className={clsx('block px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-background/90 border', s.text)}>
                    {s.label}
                </span>
            </div>
        </div>
    );
};

export default AIAvatar;
