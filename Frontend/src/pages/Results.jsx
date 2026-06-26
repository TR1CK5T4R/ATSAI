import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useWindowSize } from 'react-use';
import Confetti from 'react-confetti';
import { FiAward, FiDownload, FiCheckCircle, FiAlertTriangle, FiBookOpen } from 'react-icons/fi';
import SkillChart from '../components/ui/SkillChart';
import CourseCard from '../components/ui/CourseCard';
import CircularProgress from '../components/ui/CircularProgress';

// Mock Data (Replace with API data later)
const MOCK_RESULTS = {
    finalScore: 88,
    feedback: "Strong technical understanding, specially in React and System Design. Need to improve on database optimization queries.",
    skillBreakdown: [
        { name: "React", score: 92 },
        { name: "Node.js", score: 85 },
        { name: "System Design", score: 88 },
        { name: "Database", score: 65 },
        { name: "Communication", score: 90 }
    ],
    strengths: ["Component Architecture", "State Management", "API Design"],
    weaknesses: ["SQL Optimization", "Caching Strategies"],
    recommendedCourses: [
        { title: "Advanced PostgreSQL Performance", description: "Deep dive into indexing and query planning." },
        { title: "Redis for Scalable Apps", description: "Learn caching patterns for high-load systems." },
        { title: "System Design Interview Prep", description: "Ace the architectural round." }
    ]
};

const Results = () => {
    const { width, height } = useWindowSize();
    const [results, setResults] = useState(MOCK_RESULTS); // TODO: Fetch from API using sessionId
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        if (results.finalScore >= 80) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 8000); // Stop after 8s
        }
    }, [results]);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

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
                    {/* Overall Score */}
                    <motion.div variants={itemVariants} className="md:col-span-1 bg-surface border border-border rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-xl">
                        <h3 className="text-lg font-bold text-muted mb-6 flex items-center gap-2">
                            <FiAward className="text-primary" /> Overall Score
                        </h3>
                        <CircularProgress score={results.finalScore} size={160} strokeWidth={12} />
                    </motion.div>

                    {/* Feedback */}
                    <motion.div variants={itemVariants} className="md:col-span-2 bg-gradient-to-br from-surface to-primary/5 border border-border rounded-2xl p-8 shadow-xl">
                        <h3 className="text-lg font-bold mb-4">AI Feedback</h3>
                        <p className="text-text/90 leading-relaxed text-lg">
                            "{results.feedback}"
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
                            <div>
                                <h4 className="flex items-center gap-2 text-green-500 font-bold mb-3">
                                    <FiCheckCircle /> Strengths
                                </h4>
                                <ul className="space-y-2">
                                    {results.strengths.map((s, i) => (
                                        <li key={i} className="text-sm text-muted bg-green-500/5 px-3 py-1.5 rounded-lg border border-green-500/10">
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div>
                                <h4 className="flex items-center gap-2 text-red-400 font-bold mb-3">
                                    <FiAlertTriangle /> Areas to Improve
                                </h4>
                                <ul className="space-y-2">
                                    {results.weaknesses.map((s, i) => (
                                        <li key={i} className="text-sm text-muted bg-red-500/5 px-3 py-1.5 rounded-lg border border-red-500/10">
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Skill Breakdown Chart */}
                <motion.div variants={itemVariants} className="bg-surface border border-border rounded-2xl p-8 shadow-xl">
                    <h3 className="text-xl font-bold mb-6">Skill Analysis</h3>
                    <SkillChart data={results.skillBreakdown} />
                </motion.div>

                {/* Recommended Courses */}
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

            </motion.div>
        </div>
    );
};

export default Results;
