/**
 * Admin.jsx — Staff console
 *  - Candidates tab (recruiter + admin): candidates with scores; expand → interviews + leave feedback
 *  - Interviews tab (recruiter + admin): every interview, filter, paginate, open report, leave feedback
 *  - Courses tab (admin only): create / edit / delete catalog courses
 * The backend enforces the same rules; the UI just hides what a role can't do.
 */

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FiUsers, FiBookOpen, FiPlus, FiEdit2, FiTrash2, FiExternalLink, FiChevronLeft, FiChevronRight, FiList, FiMessageSquare } from 'react-icons/fi';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import { interviewApi } from '../api/interview.api';
import { coursesApi } from '../api/courses.api';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Field from '../components/ui/Field';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/Spinner';
import CandidatesTab from '../components/admin/CandidatesTab';
import FeedbackModal from '../components/feedback/FeedbackModal';
import { formatDate, formatPrice, scoreTone, statusTone } from '../utils/format';

const PAGE_SIZE = 20;
const CURRENCIES = ['USD', 'INR', 'EUR', 'GBP'];

// ── Interviews tab ────────────────────────────────────────────────────────────

const InterviewsTab = () => {
    const [status, setStatus] = useState('');
    const [offset, setOffset] = useState(0);
    const [page, setPage] = useState(null);
    const [reviewing, setReviewing] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    const changeFilter = (next) => {
        setPage(null);
        setStatus(next.status ?? status);
        setOffset(next.offset ?? 0);
    };

    useEffect(() => {
        interviewApi
            .getHistory({ limit: PAGE_SIZE, offset, ...(status ? { status } : {}) })
            .then((res) => setPage(res.data))
            .catch((err) => {
                toast.error(err.message);
                setPage({ total: 0, items: [] });
            });
    }, [status, offset, reloadKey]);

    return (
        <Card className="p-0 sm:p-0 overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 p-4 border-b border-border">
                {[['', 'All'], ['ongoing', 'Ongoing'], ['completed', 'Completed']].map(([value, label]) => (
                    <button
                        key={label}
                        onClick={() => changeFilter({ status: value, offset: 0 })}
                        className={clsx('px-3 py-1.5 rounded-full text-sm border', status === value ? 'bg-primary text-white border-primary' : 'border-border text-muted hover:text-text')}
                    >
                        {label}
                    </button>
                ))}
                {page && <span className="ml-auto text-sm text-muted">{page.total} total</span>}
            </div>

            {!page ? (
                <PageLoader />
            ) : page.items.length === 0 ? (
                <p className="p-10 text-center text-muted text-sm">No interviews match this filter.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[640px]">
                        <thead className="text-left text-xs uppercase tracking-wider text-muted">
                            <tr className="border-b border-border">
                                <th className="px-4 py-3 font-semibold">Candidate</th>
                                <th className="px-4 py-3 font-semibold">Role</th>
                                <th className="px-4 py-3 font-semibold">Status</th>
                                <th className="px-4 py-3 font-semibold">Score</th>
                                <th className="px-4 py-3 font-semibold">Date</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {page.items.map((i) => (
                                <tr key={i.id} className="border-b border-border last:border-0 hover:bg-white/[0.02]">
                                    <td className="px-4 py-3">
                                        <p className="font-medium">{i.candidate?.name || '—'}</p>
                                        <p className="text-xs text-muted">{i.candidate?.email}</p>
                                    </td>
                                    <td className="px-4 py-3 text-muted">{i.targetRole || '—'}</td>
                                    <td className="px-4 py-3"><Badge tone={statusTone(i.status)} className="capitalize">{i.status}</Badge></td>
                                    <td className="px-4 py-3"><Badge tone={scoreTone(i.score)}>{i.score ?? '—'}</Badge></td>
                                    <td className="px-4 py-3 text-muted whitespace-nowrap">{formatDate(i.createdAt)}</td>
                                    <td className="px-4 py-3 text-right">
                                        {i.status === 'completed' && (
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="sm" to={`/results?id=${i.id}`}>Report</Button>
                                                <Button variant="ghost" size="sm" onClick={() => setReviewing(i)} aria-label="Leave feedback">
                                                    <FiMessageSquare /> {i.feedbacks?.length || 0}
                                                </Button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {page && page.total > PAGE_SIZE && (
                <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
                    <span className="text-sm text-muted mr-2">
                        {offset + 1}–{Math.min(offset + PAGE_SIZE, page.total)} of {page.total}
                    </span>
                    <Button variant="secondary" size="sm" disabled={offset === 0} onClick={() => changeFilter({ offset: offset - PAGE_SIZE })} aria-label="Previous page"><FiChevronLeft /></Button>
                    <Button variant="secondary" size="sm" disabled={offset + PAGE_SIZE >= page.total} onClick={() => changeFilter({ offset: offset + PAGE_SIZE })} aria-label="Next page"><FiChevronRight /></Button>
                </div>
            )}
            {reviewing && (
                <FeedbackModal
                    interview={reviewing}
                    onClose={() => setReviewing(null)}
                    onSaved={() => {
                        setReviewing(null);
                        setReloadKey((k) => k + 1);
                    }}
                />
            )}
        </Card>
    );
};

// ── Courses tab (admin) ───────────────────────────────────────────────────────

const CourseForm = ({ initial, onSubmit, onCancel }) => {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        defaultValues: initial || { currency: 'USD', price: 0 },
    });

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Field label="Title" error={errors.title?.message} {...register('title', { required: 'Title is required', minLength: { value: 3, message: 'At least 3 characters' } })} />
            <Field label="Skill tag" placeholder="e.g. React, System Design" error={errors.skillTag?.message} {...register('skillTag', { required: 'Skill tag is required' })} />
            <div className="grid grid-cols-2 gap-3">
                <Field label="Price" type="number" step="0.01" min="0" error={errors.price?.message} {...register('price', { required: 'Price is required', valueAsNumber: true, min: { value: 0, message: 'Must be ≥ 0' } })} />
                <Field label="Currency" as="select" {...register('currency')}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Field>
            </div>
            <Field label="URL" type="url" placeholder="https://…" error={errors.url?.message} {...register('url', { required: 'URL is required', pattern: { value: /^https?:\/\/\S+$/, message: 'Must start with http(s)://' } })} />
            <Field label="Description" as="textarea" rows={3} {...register('description')} />
            <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button type="submit" loading={isSubmitting}>{initial ? 'Save changes' : 'Create course'}</Button>
            </div>
        </form>
    );
};

const CoursesTab = () => {
    const [courses, setCourses] = useState(null);
    const [editing, setEditing] = useState(null); // null = closed, {} = new, course = edit

    const load = useCallback(() => {
        coursesApi
            .getAllCourses({ limit: 100 })
            .then((res) => setCourses(res.data.items))
            .catch((err) => toast.error(err.message));
    }, []);

    useEffect(load, [load]);

    const closeModal = useCallback(() => setEditing(null), []);

    const save = async (values) => {
        // Send only editable fields (the form's defaults also hold id/timestamps when editing)
        const { title, skillTag, price, currency, url, description } = values;
        const payload = { title, skillTag, price, currency, url, description: description || '' };
        try {
            if (editing?.id) {
                await coursesApi.updateCourse(editing.id, payload);
                toast.success('Course updated');
            } else {
                await coursesApi.createCourse(payload);
                toast.success('Course created');
            }
            setEditing(null);
            load();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const remove = async (course) => {
        if (!window.confirm(`Delete "${course.title}"? This can't be undone.`)) return;
        try {
            await coursesApi.deleteCourse(course.id);
            toast.success('Course deleted');
            setCourses((list) => list.filter((c) => c.id !== course.id));
        } catch (err) {
            toast.error(err.message);
        }
    };

    if (!courses) return <PageLoader />;

    return (
        <>
            <div className="flex justify-end mb-4">
                <Button onClick={() => setEditing({})}><FiPlus /> New course</Button>
            </div>

            {courses.length === 0 ? (
                <EmptyState icon={FiBookOpen} title="No courses yet" description="Add your first course, or run npm run seed:courses on the backend." />
            ) : (
                <Card className="p-0 sm:p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[640px]">
                            <thead className="text-left text-xs uppercase tracking-wider text-muted">
                                <tr className="border-b border-border">
                                    <th className="px-4 py-3 font-semibold">Course</th>
                                    <th className="px-4 py-3 font-semibold">Skill tag</th>
                                    <th className="px-4 py-3 font-semibold">Price</th>
                                    <th className="px-4 py-3" />
                                </tr>
                            </thead>
                            <tbody>
                                {courses.map((c) => (
                                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-white/[0.02]">
                                        <td className="px-4 py-3">
                                            <a href={c.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-primary inline-flex items-center gap-1.5">
                                                {c.title} <FiExternalLink className="w-3 h-3 text-muted" />
                                            </a>
                                        </td>
                                        <td className="px-4 py-3"><Badge tone="primary">{c.skillTag}</Badge></td>
                                        <td className="px-4 py-3 whitespace-nowrap">{formatPrice(c.price, c.currency)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => setEditing(c)} aria-label={`Edit ${c.title}`}><FiEdit2 /></Button>
                                                <Button variant="ghost" size="sm" onClick={() => remove(c)} aria-label={`Delete ${c.title}`} className="hover:text-danger"><FiTrash2 /></Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            <Modal open={editing !== null} title={editing?.id ? 'Edit course' : 'New course'} onClose={closeModal}>
                {editing !== null && <CourseForm initial={editing.id ? editing : null} onSubmit={save} onCancel={closeModal} />}
            </Modal>
        </>
    );
};

// ── Page ──────────────────────────────────────────────────────────────────────

const Admin = () => {
    const isAdmin = useAuthStore((s) => s.user.role === 'admin');
    const tabs = [
        { id: 'candidates', label: 'Candidates', icon: FiUsers },
        { id: 'interviews', label: 'Interviews', icon: FiList },
        ...(isAdmin ? [{ id: 'courses', label: 'Courses', icon: FiBookOpen }] : []),
    ];
    const [tab, setTab] = useState('candidates');

    return (
        <>
            <PageHeader title={isAdmin ? 'Admin' : 'Candidates'} description={isAdmin ? 'Review candidates, leave feedback and manage the course catalog.' : 'Review candidates and leave feedback on their interviews.'} />

            {tabs.length > 1 && (
                <div className="flex gap-1 mb-6 border-b border-border overflow-x-auto" role="tablist">
                    {tabs.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            role="tab"
                            aria-selected={tab === id}
                            onClick={() => setTab(id)}
                            className={clsx(
                                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                                tab === id ? 'border-primary text-text' : 'border-transparent text-muted hover:text-text'
                            )}
                        >
                            <Icon /> {label}
                        </button>
                    ))}
                </div>
            )}

            {tab === 'candidates' && <CandidatesTab />}
            {tab === 'interviews' && <InterviewsTab />}
            {tab === 'courses' && <CoursesTab />}
        </>
    );
};

export default Admin;
