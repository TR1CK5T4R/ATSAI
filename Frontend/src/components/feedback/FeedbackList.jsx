/**
 * FeedbackList.jsx — Reviewer feedback entries for one interview.
 * feedbacks: [{ id, rating, comments, reviewer: { id, name }, updatedAt }]
 */

import StarRating from './StarRating';
import { formatDate } from '../../utils/format';

const FeedbackList = ({ feedbacks = [], currentUserId }) => {
    if (!feedbacks.length) return <p className="text-sm text-muted">No reviewer feedback yet.</p>;

    return (
        <ul className="space-y-3">
            {feedbacks.map((f) => {
                const reviewerId = f.reviewer?.id || f.reviewerId;
                return (
                    <li key={f.id} className="rounded-xl border border-border bg-white/[0.02] p-3">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <StarRating value={f.rating} readOnly size="sm" />
                            <span className="text-sm font-medium">
                                {f.reviewer?.name || 'Reviewer'}
                                {reviewerId === currentUserId && <span className="text-muted font-normal"> (you)</span>}
                            </span>
                            <span className="text-xs text-muted ml-auto">{formatDate(f.updatedAt)}</span>
                        </div>
                        {f.comments && <p className="text-sm text-text/90 mt-2 whitespace-pre-wrap">{f.comments}</p>}
                    </li>
                );
            })}
        </ul>
    );
};

export default FeedbackList;
