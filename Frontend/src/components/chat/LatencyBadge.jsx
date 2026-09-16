/**
 * LatencyBadge.jsx — Colour-coded response time.
 * Target for a natural voice conversation is ~1.5–2 s: green ≤ 2 s, amber ≤ 4 s, red above.
 */

import { FiZap } from 'react-icons/fi';
import clsx from 'clsx';

const latencyTone = (ms) => (ms <= 2000 ? 'text-secondary' : ms <= 4000 ? 'text-warning' : 'text-danger');

const LatencyBadge = ({ ms, compact = false, title }) => {
    if (ms == null) return null;
    const seconds = (ms / 1000).toFixed(ms < 10000 ? 1 : 0);
    return (
        <span className={clsx('inline-flex items-center gap-1 tabular-nums', latencyTone(ms))} title={title || `Response time ${ms} ms`}>
            <FiZap className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
            {seconds}s
        </span>
    );
};

export default LatencyBadge;
