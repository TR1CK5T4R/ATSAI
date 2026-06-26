import React from 'react';
import { motion } from 'framer-motion';
import { FiExternalLink, FiClock, FiStar } from 'react-icons/fi';

const CourseCard = ({ course, index }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="group bg-surface border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-colors"
        >
            <div className="h-32 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                <h3 className="text-xl font-bold text-center text-white relative z-10">{course.title}</h3>
            </div>

            <div className="p-5">
                <div className="flex items-center justify-between text-sm text-muted mb-4">
                    <span className="flex items-center gap-1"><FiClock /> {course.duration || '4 weeks'}</span>
                    <span className="flex items-center gap-1 text-yellow-500"><FiStar fill="currentColor" /> {course.rating || '4.8'}</span>
                </div>

                <p className="text-sm text-muted mb-6 line-clamp-2">
                    {course.description || "Master this skill with comprehensive lessons and hands-on projects."}
                </p>

                <a
                    href={course.link || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 rounded-lg border border-border flex items-center justify-center gap-2 text-sm font-medium hover:bg-primary hover:border-primary hover:text-white transition-all"
                >
                    View Course <FiExternalLink />
                </a>
            </div>
        </motion.div>
    );
};

export default CourseCard;
