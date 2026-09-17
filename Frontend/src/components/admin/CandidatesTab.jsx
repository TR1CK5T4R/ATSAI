/**
 * CandidatesTab.jsx — Recruiter view: every candidate with their interview scores.
 * Expand a candidate to see their interviews, open reports and leave feedback
 * (POST /feedback/add) on completed ones.
 */

import { useCallback, useEffect, useState } from 'react';
import { FiChevronDown, FiChevronLeft, FiChevronRight, FiSearch, FiMessageSquare, FiFileText, FiUsers } from 'react-icons/fi';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { usersApi } from '../../api/users.api';
import { interviewApi } from '../../api/interview.api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import Spinner, { PageLoader } from '../ui/Spinner';
import { inputClass } from '../ui/Field';
import StarRating from '../feedback/StarRating';
import FeedbackModal from '../feedback/FeedbackModal';
import { formatDate, scoreTone } from '../../utils/format';

const PAGE_SIZE = 20;

const averageRating = (feedbacks = []) =>
    feedbacks.length ? Math.round(feedbacks.reduce((n, f) => n + f.rating, 0) / feedbacks.length) : 0;

/** A candidate's interviews, loaded when the row is expanded */
const CandidateInterviews = ({ candidate }) => {
    const [items, setItems] = useState(null);
    const [reviewing, setReviewing] = useState(null);

    const load = useCallback(() => {
        interviewApi
            .getHistory({ userId: candidate.id, limit: 50 })
            .then((res) => setItems(res.data.items))
            .catch((err) => {
                toast.error(err.message);
                setItems([]);
            });
    }, [candidate.id]);

    useEffect(load, [load]);

    if (!items) {
        return (
            <div className="flex items-center gap-2 text-sm text-muted py-4 px-4">
                <Spinner className="w-4 h-4" /> Loading interviews…
            </div>
        );
    }
    if (!items.length) return <p className="text-sm text-muted py-4 px-4">No interviews yet.</p>;

    return (
        <>
            <ul className="divide-y divide-border">
                {items.map((i) => {
                    const done = i.status === 'completed';
                    return (
                        <li key={i.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                            <div className="min-w-0 flex-1 basis-48">
                                <p className="text-sm font-medium truncate">{i.targetRole || 'Mock interview'}</p>
                                <p className="text-xs text-muted">{formatDate(i.completedAt || i.createdAt)}</p>
                            </div>
                            {done ? <Badge tone={scoreTone(i.score)}>Score {i.score ?? '—'}</Badge> : <Badge>Not finished</Badge>}
                            {done && (
                                <span className="flex items-center gap-1.5 text-xs text-muted" title={`${i.feedbacks?.length || 0} reviewer(s)`}>
                                    <StarRating value={averageRating(i.feedbacks)} readOnly size="sm" />
                                    {i.feedbacks?.length || 0}
                                </span>
                            )}
                            {done && (
                                <div className="flex gap-1 ml-auto">
                                    <Button variant="ghost" size="sm" to={`/results?id=${i.id}`}>
                                        <FiFileText /> Report
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={() => setReviewing({ ...i, candidate })}>
                                        <FiMessageSquare /> Feedback
                                    </Button>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
            {reviewing && (
                <FeedbackModal
                    interview={reviewing}
                    onClose={() => setReviewing(null)}
                    onSaved={() => {
                        setReviewing(null);
                        load();
                    }}
                />
            )}
        </>
    );
};

const CandidatesTab = () => {
    const [search, setSearch] = useState('');
    const [query, setQuery] = useState('');
    const [offset, setOffset] = useState(0);
    const [page, setPage] = useState(null);
    const [expanded, setExpanded] = useState(null);

    // Debounce typing → query (the timer callback, not the effect body, updates state)
    useEffect(() => {
        const t = setTimeout(() => {
            if (search.trim() !== query) {
                setPage(null);
                setOffset(0);
                setQuery(search.trim());
            }
        }, 300);
        return () => clearTimeout(t);
    }, [search, query]);

    useEffect(() => {
        let cancelled = false;
        usersApi
            .listCandidates({ q: query || undefined, limit: PAGE_SIZE, offset })
            .then((res) => !cancelled && setPage(res.data))
            .catch((err) => {
                toast.error(err.message);
                if (!cancelled) setPage({ total: 0, items: [] });
            });
        return () => {
            cancelled = true;
        };
    }, [query, offset]);

    const goTo = (next) => {
        setPage(null);
        setExpanded(null);
        setOffset(next);
    };

    return (
        <div className="space-y-4">
            <div className="relative max-w-md">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or email…"
                    aria-label="Search candidates"
                    className={clsx(inputClass, 'pl-10')}
                />
            </div>

            {!page ? (
                <PageLoader />
            ) : page.items.length === 0 ? (
                <EmptyState icon={FiUsers} title={query ? 'No candidates match your search' : 'No candidates yet'} />
            ) : (
                <Card className="p-0 sm:p-0 overflow-hidden">
                    {/* Column labels (desktop) */}
                    <div className="hidden md:grid grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_2rem] gap-4 px-4 py-3 border-b border-border text-xs uppercase tracking-wider text-muted font-semibold">
                        <span>Candidate</span>
                        <span>Interviews</span>
                        <span>Average</span>
                        <span>Best</span>
                        <span>Latest</span>
                        <span />
                    </div>
                    <ul className="divide-y divide-border">
                        {page.items.map((c) => {
                            const open = expanded === c.id;
                            return (
                                <li key={c.id}>
                                    <button
                                        onClick={() => setExpanded(open ? null : c.id)}
                                        aria-expanded={open}
                                        className="w-full text-left grid grid-cols-2 md:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_2rem] gap-x-4 gap-y-2 items-center px-4 py-3.5 hover:bg-white/[0.02]"
                                    >
                                        <span className="col-span-2 md:col-span-1 min-w-0">
                                            <span className="block font-medium truncate">{c.name}</span>
                                            <span className="block text-xs text-muted truncate">{c.email}</span>
                                        </span>
                                        <span className="text-sm">
                                            <span className="md:hidden text-muted">Interviews </span>
                                            {c.completedCount}/{c.interviewCount}
                                        </span>
                                        <span>
                                            <span className="md:hidden text-xs text-muted mr-1">Avg</span>
                                            <Badge tone={scoreTone(c.avgScore)}>{c.avgScore ?? '—'}</Badge>
                                        </span>
                                        <span>
                                            <span className="md:hidden text-xs text-muted mr-1">Best</span>
                                            <Badge tone={scoreTone(c.bestScore)}>{c.bestScore ?? '—'}</Badge>
                                        </span>
                                        <span className="text-sm">
                                            <span className="md:hidden text-xs text-muted mr-1">Latest</span>
                                            {c.latest ? (
                                                <>
                                                    <Badge tone={scoreTone(c.latest.score)}>{c.latest.score}</Badge>
                                                    <span className="block text-xs text-muted mt-0.5">{formatDate(c.latest.completedAt)}</span>
                                                </>
                                            ) : (
                                                <span className="text-muted">—</span>
                                            )}
                                        </span>
                                        <FiChevronDown className={clsx('justify-self-end text-muted transition-transform', open && 'rotate-180')} />
                                    </button>
                                    {open && (
                                        <div className="bg-background/60 border-t border-border">
                                            <CandidateInterviews candidate={c} />
                                        </div>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                    {page.total > PAGE_SIZE && (
                        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
                            <span className="text-sm text-muted mr-2">
                                {offset + 1}–{Math.min(offset + PAGE_SIZE, page.total)} of {page.total}
                            </span>
                            <Button variant="secondary" size="sm" disabled={offset === 0} onClick={() => goTo(offset - PAGE_SIZE)} aria-label="Previous page"><FiChevronLeft /></Button>
                            <Button variant="secondary" size="sm" disabled={offset + PAGE_SIZE >= page.total} onClick={() => goTo(offset + PAGE_SIZE)} aria-label="Next page"><FiChevronRight /></Button>
                        </div>
                    )}
                </Card>
            )}
        </div>
    );
};

export default CandidatesTab;
