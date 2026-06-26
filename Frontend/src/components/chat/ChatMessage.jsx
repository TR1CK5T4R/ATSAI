import React from 'react';
import { motion } from 'framer-motion';
import { FiUser, FiCpu } from 'react-icons/fi';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';

const ChatMessage = ({ message }) => {
    const isAI = message.role === 'ai';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={clsx(
                "flex gap-4 max-w-3xl mb-6",
                isAI ? "self-start" : "self-end flex-row-reverse"
            )}
        >
            {/* Icon */}
            <div className={clsx(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-lg",
                isAI ? "bg-surface border border-primary/30 text-primary" : "bg-primary text-white"
            )}>
                {isAI ? <FiCpu /> : <FiUser />}
            </div>

            {/* Bubble */}
            <div className={clsx(
                "relative px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-sm max-w-[85%]",
                isAI
                    ? "bg-surface border border-white/5 text-text rounded-tl-none"
                    : "bg-primary text-white rounded-tr-none"
            )}>
                {isAI ? (
                    <ReactMarkdown className="prose prose-invert prose-sm max-w-none">
                        {message.content}
                    </ReactMarkdown>
                ) : (
                    <p>{message.content}</p>
                )}

                {/* Timestamp */}
                <span className={clsx(
                    "text-[10px] absolute bottom-1 opacity-50",
                    isAI ? "right-3" : "left-3"
                )}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
            </div>
        </motion.div>
    );
};

export default ChatMessage;
