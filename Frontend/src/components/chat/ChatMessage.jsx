/**
 * ChatMessage.jsx — One transcript bubble.
 * message: { role: 'ai'|'user', content, timestamp, latencyMs?, kind? }
 */

import { motion } from 'framer-motion';
import { FiUser, FiCpu } from 'react-icons/fi';
import clsx from 'clsx';
import ReactMarkdown from 'react-markdown';
import LatencyBadge from './LatencyBadge';

const KIND_LABEL = { follow_up: 'Follow-up' };

const ChatMessage = ({ message }) => {
    const isAI = message.role === 'ai';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className={clsx('flex gap-3 max-w-[92%] sm:max-w-[80%] mb-5', isAI ? 'self-start' : 'self-end flex-row-reverse')}
        >
            <div
                className={clsx(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                    isAI ? 'bg-surface border border-primary/30 text-primary' : 'bg-primary text-white'
                )}
            >
                {isAI ? <FiCpu /> : <FiUser />}
            </div>

            <div className={clsx('min-w-0 flex flex-col', isAI ? 'items-start' : 'items-end')}>
                <div
                    className={clsx(
                        'px-4 py-3 rounded-2xl text-sm leading-relaxed break-words',
                        isAI ? 'bg-surface border border-border text-text rounded-tl-sm' : 'bg-primary text-white rounded-tr-sm'
                    )}
                >
                    {isAI ? (
                        <div className="prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                    ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                </div>
                <div className="flex items-center gap-2 mt-1 px-1 text-[11px] text-muted">
                    {KIND_LABEL[message.kind] && <span className="text-accent">{KIND_LABEL[message.kind]}</span>}
                    <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {isAI && message.latencyMs != null && <LatencyBadge ms={message.latencyMs} compact />}
                </div>
            </div>
        </motion.div>
    );
};

export default ChatMessage;
