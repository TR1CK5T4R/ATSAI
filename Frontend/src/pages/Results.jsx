import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWindowSize } from 'react-use';
import Confetti from 'react-confetti';
import { FiAward, FiDownload, FiCheckCircle, FiAlertTriangle, FiBookOpen } from 'react-icons/fi';
import SkillChart from '../components/ui/SkillChart';
import CourseCard from '../components/ui/CourseCard';
import CircularProgress from '../components/ui/CircularProgress';
import { interviewApi } from '../api/interview.api';
import { coursesApi } from '../api/courses.api';
import { resumeApi } from '../api/resume.api';
import toast from 'react-hot-toast';

const MOCK_RESULTS = {
    finalScore: 0,
    feedback: "Generating feedback...",
    skillBreakdown: [],
    strengths: [],
    weaknesses: [],
    recommendedCourses: []
};

const Results = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const sessionId = state?.sessionId;

    const { width, height } = useWindowSize();
    const [results, setResults] = useState(MOCK_RESULTS);
    const [resumeScore, setResumeScore] = useState(0);
    const [showConfetti, setShowConfetti] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                // Fetch Resume Score
                const resumeData = await resumeApi.getLatestScore();
                if (resumeData.success) {
                    setResumeScore(resumeData.score);
                }

                // Fetch Interview Results if sessionId exists
                if (sessionId) {
                    const interviewData = await interviewApi.getInterview(sessionId);
                    const report = interviewData.success ? interviewData.data.report : null;
                    if (report) {
                        // Chart expects [{ name, score }]
                        const formattedSkills = (report.skillBreakdown || []).map(({ skill, score }) => ({
                            name: skill,
                            score
                        }));

                        // Courses matched to this interview's skill gaps (non-fatal if it fails)
                        let formattedCourses = [];
                        try {
                            const rec = await coursesApi.getRecommendations(sessionId);
                            formattedCourses = (rec.data?.recommendations || []).map(({ course, why }) => ({
                                id: course.id,
                                title: course.title,
                                description: why,
                                link: course.url,
                            }));
                        } catch {
                            console.warn('Course recommendations unavailable');
                        }

                        setResults({
                            finalScore: report.score || 0,
                            feedback: report.summary || "Good effort overall.",
                            skillBreakdown: formattedSkills,
                            strengths: report.strengths || [],
                            weaknesses: report.weaknesses || [],
                            recommendedCourses: formattedCourses
                        });

                        if (report.score >= 80) {
                            setShowConfetti(true);
                            setTimeout(() => setShowConfetti(false), 8000);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching results", error);
                toast.error("Failed to load interview results. Showing limited data.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchResults();
    }, [sessionId]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto py-10 relative">
            {showConfetti && <Confetti width={width} height={height} numberOfPieces={200} recycle={false} />}

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-8"
            >
                {/* Header Section */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
                            Interview Results
                        </h1>
                        <p className="text-muted">Here is your comprehensive performance report.</p>
                    </div>
                    <button className="px-6 py-3 bg-surface border border-border rounded-xl flex items-center gap-2 hover:bg-border transition-colors">
                        <FiDownload /> Download PDF
                    </button>
                </div>

                {/* Top Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Overall Scores */}
                    <motion.div variants={itemVariants} className="md:col-span-1 flex flex-col gap-6">
                        <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-xl flex-1">
                            <h3 className="text-sm font-bold text-muted mb-4 flex items-center gap-2 uppercase tracking-widest">
                                <FiAward className="text-primary" /> Interview Score
                            </h3>
                            <CircularProgress score={results.finalScore} size={140} strokeWidth={10} />
                        </div>
                        <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-xl flex-1">
                            <h3 className="text-sm font-bold text-muted mb-4 flex items-center gap-2 uppercase tracking-widest">
                                <FiAward className="text-accent" /> Resume Score
                            </h3>
                            <CircularProgress score={resumeScore} size={140} strokeWidth={10} />
                        </div>
                    </motion.div>

                    {/* Feedback */}
                    <motion.div variants={itemVariants} className="md:col-span-2 bg-gradient-to-br from-surface to-primary/5 border border-border rounded-2xl p-8 shadow-xl flex flex-col">
                        <h3 className="text-lg font-bold mb-4">AI Feedback</h3>
                        <p className="text-text/90 leading-relaxed text-lg italic">
                            "{results.feedback}"
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-auto pt-8">
                            <div>
                                <h4 className="flex items-center gap-2 text-green-500 font-bold mb-3">
                                    <FiCheckCircle /> Strengths
                                </h4>
                                <ul className="space-y-2">
                                    {results.strengths.length > 0 ? results.strengths.map((s, i) => (
                                        <li key={i} className="text-sm text-muted bg-green-500/5 px-3 py-1.5 rounded-lg border border-green-500/10">
                                            {s}
                                        </li>
                                    )) : <li className="text-sm text-muted">No strengths recorded.</li>}
                                </ul>
                            </div>
                            <div>
                                <h4 className="flex items-center gap-2 text-red-400 font-bold mb-3">
                                    <FiAlertTriangle /> Areas to Improve
                                </h4>
                                <ul className="space-y-2">
                                    {results.weaknesses.length > 0 ? results.weaknesses.map((s, i) => (
                                        <li key={i} className="text-sm text-muted bg-red-500/5 px-3 py-1.5 rounded-lg border border-red-500/10">
                                            {s}
                                        </li>
                                    )) : <li className="text-sm text-muted">No weaknesses recorded.</li>}
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Skill Breakdown Chart */}
                {results.skillBreakdown.length > 0 && (
                    <motion.div variants={itemVariants} className="bg-surface border border-border rounded-2xl p-8 shadow-xl">
                        <h3 className="text-xl font-bold mb-6">Skill Analysis</h3>
                        <SkillChart data={results.skillBreakdown} />
                    </motion.div>
                )}

                {/* Recommended Courses */}
                {results.recommendedCourses.length > 0 && (
                    <motion.div variants={itemVariants}>
                        <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                            <FiBookOpen className="text-accent" /> Recommended for You
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {results.recommendedCourses.map((course, index) => (
                                <CourseCard key={index} course={course} index={index} />
                            ))}
                        </div>
                    </motion.div>
                )}

            </motion.div>
        </div>
    );
};

export default Results;
