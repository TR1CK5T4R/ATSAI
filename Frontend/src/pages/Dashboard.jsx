/**
 * Dashboard.jsx — Role-aware home
 *  - Candidate: resume score, interview stats, the next step to take, recent interviews
 *  - Recruiter/Admin: platform interview stats and the latest interviews
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiFileText, FiMic, FiAward, FiTrendingUp, FiUsers, FiCheckCircle, FiArrowRight, FiUpload } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import { resumeApi } from '../api/resume.api';
import { interviewApi } from '../api/interview.api';
import PageHeader from '../components/ui/PageHeader';
import Card, { StatCard } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/Spinner';
import { formatDate, scoreTone, statusTone } from '../utils/format';

const average = (nums) => (nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null);

const InterviewRow = ({ item, showCandidate }) => {
    // Only finished interviews have a report to open
    const Wrapper = item.status === 'completed' ? Link : 'div';
    return (
    <Wrapper
        {...(item.status === 'completed' ? { to: `/results?id=${item.id}` } : {})}
        className="flex items-center gap-4 py-3.5 px-1 border-b border-border last:border-0 hover:bg-white/[0.02] rounded-lg"
    >
        <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <FiMic />
        </div>
        <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{showCandidate ? item.candidate?.name || 'Candidate' : item.targetRole || 'Mock interview'}</p>
            <p className="text-xs text-muted truncate">
                {showCandidate ? `${item.targetRole || 'Interview'} · ` : ''}{formatDate(item.createdAt)}
            </p>
        </div>
        <Badge tone={statusTone(item.status)} className="capitalize hidden sm:inline-flex">{item.status}</Badge>
        <Badge tone={scoreTone(item.score)}>{item.score ?? '—'}</Badge>
    </Wrapper>
    );
};

const CandidateDashboard = ({ data }) => {
    const { resumes, resumeScore, interviews } = data;
    const completed = interviews.items.filter((i) => i.status === 'completed');
    const scores = completed.map((i) => i.score).filter((s) => s !== null);

    const next = !resumes.length
        ? { title: 'Upload your resume', text: 'We parse it with AI and tailor every interview question to it.', to: '/resume', cta: 'Upload resume', icon: FiUpload }
        : !completed.length
            ? { title: 'Take your first mock interview', text: '8 voice questions based on your resume — about 15 minutes.', to: '/interview', cta: 'Start interview', icon: FiMic }
            : { title: 'See your latest report', text: 'Review your score, skill gaps and recommended courses.', to: `/results?id=${completed[0].id}`, cta: 'View results', icon: FiAward };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Resume score" value={resumes.length ? resumeScore : '—'} hint={resumes.length ? 'Based on your latest resume' : 'No resume yet'} icon={FiFileText} />
                <StatCard label="Interviews" value={interviews.total} hint={`${completed.length} completed`} icon={FiMic} tone="accent" />
                <StatCard label="Average score" value={average(scores) ?? '—'} icon={FiTrendingUp} tone="secondary" />
                <StatCard label="Best score" value={scores.length ? Math.max(...scores) : '—'} icon={FiAward} tone="warning" />
            </div>

            <Card className="flex flex-col sm:flex-row sm:items-center gap-5 bg-gradient-to-br from-surface to-primary/10 border-primary/20">
                <div className="w-12 h-12 shrink-0 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                    <next.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">Next step</p>
                    <h2 className="text-lg font-semibold mt-0.5">{next.title}</h2>
                    <p className="text-sm text-muted">{next.text}</p>
                </div>
                <Button to={next.to}>
                    {next.cta} <FiArrowRight />
                </Button>
            </Card>

            <Card>
                <h2 className="font-semibold mb-2">Recent interviews</h2>
                {interviews.items.length ? (
                    interviews.items.map((item) => <InterviewRow key={item.id} item={item} />)
                ) : (
                    <p className="text-sm text-muted py-6 text-center">No interviews yet.</p>
                )}
            </Card>
        </div>
    );
};

const StaffDashboard = ({ data }) => {
    const { interviews, completedTotal } = data;
    const scores = interviews.items.map((i) => i.score).filter((s) => s !== null && s !== undefined);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard label="Total interviews" value={interviews.total} icon={FiUsers} />
                <StatCard label="Completed" value={completedTotal} icon={FiCheckCircle} tone="secondary" />
                <StatCard label="Avg. recent score" value={average(scores) ?? '—'} hint="Last 10 interviews" icon={FiTrendingUp} tone="accent" />
            </div>
            <Card>
                <div className="flex items-center justify-between mb-2">
                    <h2 className="font-semibold">Latest interviews</h2>
                    <Button variant="ghost" size="sm" to="/admin">View all <FiArrowRight /></Button>
                </div>
                {interviews.items.length ? (
                    interviews.items.map((item) => <InterviewRow key={item.id} item={item} showCandidate />)
                ) : (
                    <EmptyState icon={FiUsers} title="No interviews yet" description="Candidate interviews will appear here." />
                )}
            </Card>
        </div>
    );
};

const Dashboard = () => {
    const user = useAuthStore((s) => s.user);
    const isCandidate = user.role === 'candidate';
    const [data, setData] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                if (isCandidate) {
                    const [resumes, score, interviews] = await Promise.all([
                        resumeApi.getMyResume(),
                        resumeApi.getLatestScore(),
                        interviewApi.getHistory({ limit: 10 }),
                    ]);
                    if (!cancelled) setData({ resumes: resumes.data, resumeScore: score.score, interviews: interviews.data });
                } else {
                    const [interviews, completed] = await Promise.all([
                        interviewApi.getHistory({ limit: 10 }),
                        interviewApi.getHistory({ limit: 1, status: 'completed' }),
                    ]);
                    if (!cancelled) setData({ interviews: interviews.data, completedTotal: completed.data.total });
                }
            } catch (err) {
                toast.error(err.message);
                if (!cancelled) setData(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [isCandidate]);

    return (
        <>
            <PageHeader
                title={`Hi, ${user.name.split(' ')[0]} 👋`}
                description={isCandidate ? 'Track your progress and pick up where you left off.' : 'An overview of candidate interviews.'}
            />
            {data === null && <PageLoader />}
            {data === false && <EmptyState title="Couldn't load your dashboard" description="Please refresh the page." />}
            {data && (isCandidate ? <CandidateDashboard data={data} /> : <StaffDashboard data={data} />)}
        </>
    );
};

export default Dashboard;
