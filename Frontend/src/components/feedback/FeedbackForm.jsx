/**
 * FeedbackForm.jsx — Recruiter/admin rating (1–5) + notes for a completed interview.
 * Posts to POST /feedback/add; re-submitting updates the reviewer's existing entry.
 */

import { useState } from 'react';
import toast from 'react-hot-toast';
import { feedbackApi } from '../../api/feedback.api';
import StarRating from './StarRating';
import Button from '../ui/Button';
import Field from '../ui/Field';

const MAX_COMMENTS = 2000;

const FeedbackForm = ({ interviewId, existing, onSaved, onCancel }) => {
    const [rating, setRating] = useState(existing?.rating || 0);
    const [comments, setComments] = useState(existing?.comments || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e) => {
        e.preventDefault();
        if (!rating) {
            setError('Choose a rating from 1 to 5');
            return;
        }
        setError('');
        setSaving(true);
        try {
            const { data } = await feedbackApi.add({ interviewId, rating, comments: comments.trim() });
            toast.success(existing ? 'Feedback updated' : 'Feedback saved');
            onSaved?.(data);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
                <p className="text-sm font-medium mb-2">Rating</p>
                <StarRating value={rating} onChange={(n) => { setRating(n); setError(''); }} />
                {error && <p className="text-danger text-xs mt-1.5">{error}</p>}
            </div>
            <Field
                as="textarea"
                name="comments"
                label="Notes"
                rows={4}
                maxLength={MAX_COMMENTS}
                placeholder="What stood out? What should the candidate work on?"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
            />
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted">{comments.length}/{MAX_COMMENTS} · Visible to recruiters and admins only</span>
                <div className="flex gap-2">
                    {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
                    <Button type="submit" loading={saving}>{existing ? 'Update feedback' : 'Save feedback'}</Button>
                </div>
            </div>
        </form>
    );
};

export default FeedbackForm;
