import React from 'react';
import { motion } from 'framer-motion';

const CircularProgress = ({ score, size = 120, strokeWidth = 8 }) => {
    const center = size / 2;
    const radius = center - strokeWidth;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    let color = '#3b82f6'; // Blue (Primary)
    let text = 'Good';

    if (score >= 90) { color = '#10b981'; text = 'Excellent'; } // Green
    else if (score >= 70) { color = '#3b82f6'; text = 'Good'; } // Blue
    else if (score >= 50) { color = '#f59e0b'; text = 'Average'; } // Orange
    else { color = '#ef4444'; text = 'Needs Work'; } // Red

    return (
        <div className="relative flex flex-col items-center justify-center">
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke="#27272a"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />
                <motion.circle
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-3xl font-bold text-white"
                >
                    {score}
                </motion.span>
            </div>
            <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 }}
                className="mt-2 text-sm font-medium"
                style={{ color }}
            >
                {text}
            </motion.span>
        </div>
    );
};

export default CircularProgress;
