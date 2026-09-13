import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FiUploadCloud, FiFileText, FiCheckCircle, FiAlertCircle, FiArrowRight, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { resumeApi } from '../api/resume.api'; // Import Centralized API
import CircularProgress from '../components/ui/CircularProgress';

const ResumeUpload = () => {
    const [file, setFile] = useState(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [analysis, setAnalysis] = useState(null);
    const navigate = useNavigate();

    const validateFile = (selectedFile) => {
        if (!selectedFile) return false;
        if (selectedFile.type !== 'application/pdf') {
            toast.error('Only PDF files are allowed');
            return false;
        }
        if (selectedFile.size > 5 * 1024 * 1024) {
            toast.error('File size must be less than 5MB');
            return false;
        }
        return true;
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (validateFile(selectedFile)) setFile(selectedFile);
    };

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(false);
        const droppedFile = e.dataTransfer.files[0];
        if (validateFile(droppedFile)) setFile(droppedFile);
    }, []);

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('resume', file);

        try {
            // Use Centralized API
            const response = await resumeApi.uploadResume(formData);

            // Assuming response.data contains the analysis result
            // Backend structure: { status: 'success', data: { ... } }
            setAnalysis(response.data);
            toast.success('Resume analyzed successfully!');
        } catch (error) {
            toast.error(error.message || 'Failed to upload resume');
        } finally {
            setUploading(false);
        }
    };

    const startInterview = () => {
        // The interview is generated from this exact resume (role is derived server-side)
        navigate('/interview', { state: { resumeId: analysis?.id } });
    };

    // ... (Keep existing UI rendering logic)
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="max-w-5xl mx-auto py-10">
            <motion.div
                initial="hidden"
                animate="visible"
                variants={containerVariants}
                className="mb-8 text-center"
            >
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4">
                    Upload Your Resume
                </h1>
                <p className="text-muted text-lg max-w-2xl mx-auto">
                    Our AI will analyze your skills, experience, and match you with the best interview questions.
                </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

                {/* Left Column: Upload Area */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="bg-surface border border-border rounded-2xl p-8 shadow-xl"
                >
                    {!analysis ? (
                        <div className="h-full flex flex-col">
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
                                onDrop={handleDrop}
                                className={`
                    flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-10 transition-all cursor-pointer
                    ${isDragOver ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 hover:bg-surface/50'}
                  `}
                            >
                                <input
                                    type="file"
                                    id="resume-upload"
                                    accept=".pdf"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />

                                <AnimatePresence mode='wait'>
                                    {file ? (
                                        <motion.div
                                            key="file-selected"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="text-center"
                                        >
                                            <FiFileText className="w-16 h-16 text-primary mx-auto mb-4" />
                                            <p className="text-lg font-medium text-text mb-1">{file.name}</p>
                                            <p className="text-sm text-muted mb-6">{(file.size / 1024 / 1024).toFixed(2)} MB</p>

                                            <button
                                                onClick={() => setFile(null)}
                                                className="text-sm text-red-400 hover:text-red-300 transition-colors"
                                            >
                                                Remove File
                                            </button>
                                        </motion.div>
                                    ) : (
                                        <motion.label
                                            key="upload-prompt"
                                            htmlFor="resume-upload"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="text-center cursor-pointer"
                                        >
                                            <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg border border-border">
                                                <FiUploadCloud className="w-8 h-8 text-primary" />
                                            </div>
                                            <p className="text-lg font-medium text-text mb-2">Click to upload or drag & drop</p>
                                            <p className="text-sm text-muted">PDF only, max 5MB</p>
                                        </motion.label>
                                    )}
                                </AnimatePresence>
                            </div>

                            {file && (
                                <motion.button
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onClick={handleUpload}
                                    disabled={uploading}
                                    className="mt-6 w-full py-4 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                                >
                                    {uploading ? (
                                        <>
                                            <FiLoader className="animate-spin text-xl" />
                                            Analyzing Resume...
                                        </>
                                    ) : (
                                        <>
                                            Analyze Resume
                                            <FiArrowRight className="text-xl" />
                                        </>
                                    )}
                                </motion.button>
                            )}
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-10"
                        >
                            <div className="mb-6">
                                <FiCheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
                                <h2 className="text-2xl font-bold text-text">Analysis Complete!</h2>
                                <p className="text-muted">Your resume has been processed successfully.</p>
                            </div>

                            <div className="flex justify-center mb-8">
                                <div className="bg-surface/50 border border-border rounded-xl p-4 flex items-center gap-4">
                                    <FiFileText className="text-primary text-xl" />
                                    <span className="font-medium text-sm">{file?.name}</span>
                                </div>
                            </div>

                            <button
                                onClick={startInterview}
                                className="w-full py-4 bg-gradient-to-r from-primary to-accent text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-xl shadow-primary/20"
                            >
                                Start AI Interview
                                <FiArrowRight className="text-xl" />
                            </button>
                        </motion.div>
                    )}
                </motion.div>

                {/* Right Column: Analysis Results */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-6"
                >
                    {analysis ? (
                        <>
                            {/* Score Card */}
                            <motion.div variants={itemVariants} className="bg-surface border border-border rounded-2xl p-6 shadow-xl flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold mb-1">Resume Score</h3>
                                    <p className="text-muted text-sm">Based on ATS standards</p>
                                </div>
                                <CircularProgress score={analysis.resumeScore || 0} size={100} />
                            </motion.div>

                            {/* Skills Card */}
                            <motion.div variants={itemVariants} className="bg-surface border border-border rounded-2xl p-6 shadow-xl">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <FiCheckCircle className="text-secondary" /> Extracted Skills
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {analysis.extractedSkills?.length > 0 ? (
                                        analysis.extractedSkills.map((skill, index) => (
                                            <span
                                                key={index}
                                                className="px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-sm font-medium"
                                            >
                                                {skill}
                                            </span>
                                        ))
                                    ) : (
                                        <p className="text-muted text-sm">No skills detected.</p>
                                    )}
                                </div>
                            </motion.div>

                            {/* Suggestions Card */}
                            <motion.div variants={itemVariants} className="bg-surface border border-border rounded-2xl p-6 shadow-xl">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <FiAlertCircle className="text-accent" /> AI Suggestions
                                </h3>
                                <ul className="space-y-3">
                                    {/* Mock suggestions if none returned from API yet, assuming API structure matches */}
                                    {(analysis.aiSuggestions || ["Add more quantitative metrics", "Highlight leadership roles"]).map((tip, index) => (
                                        <li key={index} className="flex gap-3 text-sm text-text/80">
                                            <span className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
                                            {tip}
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        </>
                    ) : (
                        /* Loading/Placeholder Skeletons */
                        <div className="space-y-6 opacity-30 pointer-events-none grayscale">
                            <div className="bg-surface border border-border rounded-2xl p-6 h-32 animate-pulse" />
                            <div className="bg-surface border border-border rounded-2xl p-6 h-48 animate-pulse" />
                            <div className="bg-surface border border-border rounded-2xl p-6 h-48 animate-pulse" />
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};

export default ResumeUpload;
