/**
 * Courses.jsx — Course catalog with search + skill filter, personal
 * recommendations (candidates with a finished interview) and Enroll → checkout.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiBookOpen, FiZap } from 'react-icons/fi';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import { coursesApi } from '../api/courses.api';
import { interviewApi } from '../api/interview.api';
import PageHeader from '../components/ui/PageHeader';
import CourseCard from '../components/ui/CourseCard';
import EmptyState from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/Spinner';
import { inputClass } from '../components/ui/Field';

/** The mock provider links to our own /checkout/mock route; real providers link off-site */
const openPaymentLink = (link, navigate) => {
    const url = new URL(link, window.location.origin);
    if (url.origin === window.location.origin) navigate(url.pathname + url.search);
    else window.location.assign(url.toString());
};

const Courses = () => {
    const user = useAuthStore((s) => s.user);
    const navigate = useNavigate();
    const [courses, setCourses] = useState(null);
    const [recommended, setRecommended] = useState([]);
    const [query, setQuery] = useState('');
    const [tag, setTag] = useState('All');
    const [enrollingId, setEnrollingId] = useState(null);

    useEffect(() => {
        coursesApi
            .getAllCourses({ limit: 100 })
            .then((res) => setCourses(res.data.items))
            .catch((err) => {
                toast.error(err.message);
                setCourses([]);
            });

        if (user.role === 'candidate') {
            interviewApi
                .getHistory({ status: 'completed', limit: 1 })
                .then((h) => h.data.items[0] && coursesApi.getRecommendations(h.data.items[0].id))
                .then((rec) => rec && setRecommended(rec.data.recommendations))
                .catch(() => {}); // optional section
        }
    }, [user.role]);

    const tags = useMemo(() => ['All', ...new Set((courses || []).map((c) => c.skillTag))].sort((a, b) => (a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b))), [courses]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return (courses || []).filter(
            (c) =>
                (tag === 'All' || c.skillTag === tag) &&
                (!q || c.title.toLowerCase().includes(q) || c.skillTag.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
        );
    }, [courses, query, tag]);

    const handleEnroll = async (course) => {
        setEnrollingId(course.id);
        try {
            const { data } = await coursesApi.checkout(course.id);
            openPaymentLink(data.paymentLink, navigate);
        } catch (err) {
            toast.error(err.message);
        } finally {
            setEnrollingId(null);
        }
    };

    if (courses === null) return <PageLoader />;

    return (
        <>
            <PageHeader title="Courses" description="Hand-picked courses to close the skill gaps from your interviews." />

            {recommended.length > 0 && (
                <section className="mb-10">
                    <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
                        <FiZap className="text-accent" /> Recommended from your last interview
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {recommended.map((rec, i) => (
                            <CourseCard key={rec.course.id} course={rec.course} why={rec.why} index={i} onEnroll={handleEnroll} enrolling={enrollingId === rec.course.id} />
                        ))}
                    </div>
                </section>
            )}

            <div className="flex flex-col gap-4 mb-6">
                <div className="relative max-w-md">
                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search courses or skills…" className={clsx(inputClass, 'pl-10')} aria-label="Search courses" />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
                    {tags.map((t) => (
                        <button
                            key={t}
                            onClick={() => setTag(t)}
                            className={clsx(
                                'shrink-0 px-3 py-1.5 rounded-full text-sm border transition-colors',
                                tag === t ? 'bg-primary text-white border-primary' : 'border-border text-muted hover:text-text'
                            )}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {filtered.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map((course, i) => (
                        <CourseCard key={course.id} course={course} index={i} onEnroll={handleEnroll} enrolling={enrollingId === course.id} />
                    ))}
                </div>
            ) : (
                <EmptyState icon={FiBookOpen} title="No courses found" description={courses.length ? 'Try a different search or skill.' : 'The catalog is empty — an admin can add courses.'} />
            )}
        </>
    );
};

export default Courses;
