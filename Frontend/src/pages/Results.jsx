/**
 * Results.jsx — Interview report: circular overall score, strengths-vs-gaps chart,
 * written AI feedback, recommended courses with Buy buttons, and (staff only)
 * reviewer feedback.
 *
 * Which interview: ?id=<interviewId> (shareable, used by Dashboard/Admin), else
 * router state from the Interview page, else the user's latest completed one.
 */

import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useWindowSize } from 'react-use';
import Confetti from 'react-confetti';
import { FiAward, FiPrinter, FiCheckCircle, FiAlertTriangle, FiBookOpen, FiMic } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { interviewApi } from '../api/interview.api';
import { coursesApi } from '../api/courses.api';
import { useAuthStore } from '../store/useAuthStore';
import useEnroll from '../hooks/useEnroll';
import ReviewerFeedback from '../components/feedback/ReviewerFeedback';
import { STAFF_ROLES } from '../constants/nav';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/Spinner';
import CircularProgress from '../components/ui/CircularProgress';
import SkillChart from '../components/ui/SkillChart';
import CourseCard from '../components/ui/CourseCard';
import { formatDate } from '../utils/format';

const ListCard = ({ title, icon: Icon, tone, items, empty }) => (
    <Card>
        <h3 className={`flex items-center gap-2 font-semibold mb-4 ${tone}`}>
            <Icon /> {title}
        </h3>
        {items.length ? (
            <ul className="space-y-2">
                {items.map((item, i) => (
                    <li key={i} className="text-sm text-text/90 bg-white/[0.03] border border-border rounded-lg px-3 py-2">{item}</li>
                ))}
            </ul>
        ) : (
            <p className="text-sm text-muted">{empty}</p>
        )}
    </Card>
);

const Results = () => {
    const [params] = useSearchParams();
    const { state } = useLocation();
    const { width, height } = useWindowSize();
    const user = useAuthStore((s) => s.user);
    const isStaff = STAFF_ROLES.includes(user.role);
    const { enroll, enrollingId } = useEnroll();

    const [data, setData] = useState(undefined); // undefined = loading, null = nothing to show
    const [courses, setCourses] = useState([]);
    const [showConfetti, setShowConfetti] = useState(false);

    const requestedId = params.get('id') || state?.sessionId;

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                let id = requestedId;
                if (!id) {
                    const history = await interviewApi.getHistory({ status: 'completed', limit: 1 });
                    id = history.data.items[0]?.id;
                }
                if (!id) {
                    if (!cancelled) setData(null);
                    return;
                }

                const { data: result } = await interviewApi.getInterview(id);
                if (cancelled) return;
                setData(result);

                if (result.report) {
                    if (result.report.score >= 80) {
                        setShowConfetti(true);
                        setTimeout(() => !cancelled && setShowConfetti(false), 7000);
                    }
                    // Recommendations are a bonus — never block the report on them
                    coursesApi
                        .getRecommendations(id)
                        .then((rec) => !cancelled && setCourses(rec.data.recommendations))
                        .catch(() => {});
                }
            } catch (err) {
                toast.error(err.message);
                if (!cancelled) setData(null);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [requestedId]);

    if (data === undefined) return <PageLoader label="Loading your report…" />;

    if (!data) {
        return (
            <EmptyState
                icon={FiAward}
                title="No interview results yet"
                description="Finish a mock interview to get your score, skill gaps and course recommendations."
                action={<Button to="/interview"><FiMic /> Start an interview</Button>}
            />
        );
    }

    const { interview, report } = data;

    if (!report) {
        return (
            <EmptyState
                icon={FiMic}
                title="This interview isn't finished yet"
                description="The report is generated once the interview is finished."
                action={<Button to="/dashboard">Back to dashboard</Button>}
            />
        );
    }

    const isOwner = interview.userId === user.id;
    const hasSkills = report.skillBreakdown?.length > 0 || report.skillGaps?.length > 0;

    return (
        <div className="relative">
            {showConfetti && <Confetti width={width} height={height} numberOfPieces={180} recycle={false} />}

            <PageHeader
                title="Interview report"
                description={`${interview.targetRole || 'Mock interview'} · ${formatDate(report.completedAt || interview.updatedAt)}`}
                actions={
                    <Button variant="secondary" onClick={() => window.print()} className="no-print">
                        <FiPrinter /> Print / PDF
                    </Button>
                }
            />

            <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Card className="flex flex-col items-center justify-center text-center">
                        <p className="text-xs uppercase tracking-wider text-muted font-semibold mb-4">Overall score</p>
                        <CircularProgress score={report.score ?? 0} size={150} strokeWidth={10} />
                    </Card>

                    <Card className="lg:col-span-2 bg-gradient-to-br from-surface to-primary/5">
                        <h3 className="font-semibold mb-3">Written feedback</h3>
                        <p className="text-text/90 leading-relaxed">{report.summary || 'No summary available.'}</p>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ListCard title="Strengths" icon={FiCheckCircle} tone="text-secondary" items={report.strengths || []} empty="No strengths recorded." />
                    <ListCard title="Areas to improve" icon={FiAlertTriangle} tone="text-danger" items={report.weaknesses || []} empty="No weaknesses recorded." />
                </div>

                {hasSkills && (
                    <Card>
                        <h3 className="font-semibold mb-1">Strengths vs gaps</h3>
                        <p className="text-sm text-muted mb-4">Per-skill scores from this interview against a target of 70.</p>
                        <SkillChart skillBreakdown={report.skillBreakdown} skillGaps={report.skillGaps} />
                    </Card>
                )}

                {isStaff && <ReviewerFeedback interviewId={interview.id} />}

                {courses.length > 0 && (
                    <section className="no-print">
                        <h3 className="flex items-center gap-2 text-xl font-bold mb-4">
                            <FiBookOpen className="text-accent" /> Recommended for you
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {courses.map((rec, i) => (
                                <CourseCard
                                    key={rec.course.id}
                                    course={rec.course}
                                    why={rec.why}
                                    index={i}
                                    onEnroll={isOwner ? enroll : undefined}
                                    enrolling={enrollingId === rec.course.id}
                                />
                            ))}
                        </div>
                        <div className="mt-4">
                            <Button variant="ghost" to="/courses">Browse all courses</Button>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default Results;
