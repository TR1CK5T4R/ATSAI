/**
 * FeedbackModal.jsx — Leave/edit reviewer feedback for one completed interview,
 * with the other reviewers' feedback shown underneath.
 *
 * interview: { id, targetRole, score, completedAt, candidate?: { name }, feedbacks?: [...] }
 */

import { useAuthStore } from '../../store/useAuthStore';
import Modal from '../ui/Modal';
import Badge from '../ui/Badge';
import FeedbackForm from './FeedbackForm';
import FeedbackList from './FeedbackList';
import { formatDate, scoreTone } from '../../utils/format';

const FeedbackModal = ({ interview, onClose, onSaved }) => {
    const userId = useAuthStore((s) => s.user.id);
    if (!interview) return null;

    const feedbacks = interview.feedbacks || [];
    const mine = feedbacks.find((f) => (f.reviewer?.id || f.reviewerId) === userId);
    const others = feedbacks.filter((f) => f !== mine);

    return (
        <Modal open title="Interview feedback" onClose={onClose}>
            <div className="flex flex-wrap items-center gap-2 mb-5 text-sm">
                <span className="font-medium">{interview.candidate?.name || 'Candidate'}</span>
                <span className="text-muted">· {interview.targetRole || 'Interview'} · {formatDate(interview.completedAt || interview.createdAt)}</span>
                <Badge tone={scoreTone(interview.score)} className="ml-auto">AI score {interview.score ?? '—'}</Badge>
            </div>
            <FeedbackForm interviewId={interview.id} existing={mine} onCancel={onClose} onSaved={onSaved} />
            {others.length > 0 && (
                <div className="mt-6 pt-5 border-t border-border">
                    <p className="text-sm font-medium mb-3">Other reviewers</p>
                    <FeedbackList feedbacks={others} currentUserId={userId} />
                </div>
            )}
        </Modal>
    );
};

export default FeedbackModal;
