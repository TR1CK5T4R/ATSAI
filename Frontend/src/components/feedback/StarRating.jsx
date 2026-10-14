/**
 * StarRating.jsx — 1–5 star input (radio group semantics) or read-only display.
 */

import { useState } from 'react';
import { FiStar } from 'react-icons/fi';
import clsx from 'clsx';

const LABELS = ['', 'Poor', 'Below expectations', 'Meets expectations', 'Strong', 'Exceptional'];

const StarRating = ({ value = 0, onChange, size = 'md', readOnly = false }) => {
    const [hover, setHover] = useState(0);
    const shown = hover || value;
    const icon = size === 'sm' ? 'w-3.5 h-3.5' : 'w-6 h-6';

    if (readOnly) {
        return (
            <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
                {[1, 2, 3, 4, 5].map((n) => (
                    <FiStar key={n} className={clsx(icon, n <= value ? 'text-warning fill-warning' : 'text-border')} />
                ))}
            </span>
        );
    }

    return (
        <div className="flex items-center gap-3">
            <div role="radiogroup" aria-label="Rating" className="flex gap-1" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map((n) => (
                    <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={value === n}
                        aria-label={`${n} star${n > 1 ? 's' : ''} — ${LABELS[n]}`}
                        onMouseEnter={() => setHover(n)}
                        onClick={() => onChange(n)}
                        className="p-0.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <FiStar className={clsx(icon, 'transition-colors', n <= shown ? 'text-warning fill-warning' : 'text-muted/50')} />
                    </button>
                ))}
            </div>
            <span className="text-sm text-muted">{LABELS[shown] || 'Select a rating'}</span>
        </div>
    );
};

export default StarRating;
