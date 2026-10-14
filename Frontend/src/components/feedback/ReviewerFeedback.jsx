/**
 * ReviewerFeedback.jsx — Staff panel on a completed interview: existing reviewer
 * feedback + the current reviewer's own rating form (prefilled for editing).
 */

import { useCallback, useEffect, useState } from 'react';
import { FiMessageSquare } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { feedbackApi } from '../../api/feedback.api';
import { useAuthStore } from '../../store/useAuthStore';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { PageLoader } from '../ui/Spinner';
import FeedbackForm from './FeedbackForm';
import FeedbackList from './FeedbackList';

const ReviewerFeedback = ({ interviewId }) => {
    const userId = useAuthStore((s) => s.user.id);
    const [feedbacks, setFeedbacks] = useState(null);
    const [editing, setEditing] = useState(false);

    const load = useCallback(() => {
        feedbackApi
            .listForInterview(interviewId)
            .then((res) => setFeedbacks(res.data))
            .catch((err) => {
                toast.error(err.message);
                setFeedbacks([]);
            });
    }, [interviewId]);

    useEffect(load, [load]);

    const mine = feedbacks?.find((f) => f.reviewer?.id === userId);

    return (
        <Card>
            <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="flex items-center gap-2 font-semibold">
                    <FiMessageSquare className="text-primary" /> Reviewer feedback
                </h3>
                {feedbacks && !editing && (
                    <Button size="sm" variant={mine ? 'secondary' : 'primary'} onClick={() => setEditing(true)}>
                        {mine ? 'Edit my feedback' : 'Leave feedback'}
                    </Button>
                )}
            </div>
            {!feedbacks ? (
                <PageLoader />
            ) : (
                <div className="space-y-5">
                    {editing && (
                        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                            <FeedbackForm
                                interviewId={interviewId}
                                existing={mine}
                                onCancel={() => setEditing(false)}
                                onSaved={() => {
                                    setEditing(false);
                                    load();
                                }}
                            />
                        </div>
                    )}
                    <FeedbackList feedbacks={feedbacks} currentUserId={userId} />
                </div>
            )}
        </Card>
    );
};

export default ReviewerFeedback;
