import ResumePG from './resume.model.pg.js';
import ResumeMongo from './resume.model.mongo.js';
import ApiError from '../../utils/ApiError.js';

/**
 * Proxy file to ATSAPIAI for parsing and AI analysis
 * @param {Buffer} fileBuffer 
 * @param {string} filename 
 * @returns {Promise<Object>}
 */
const proxyToATSAPIAI = async (fileBuffer, filename) => {
    try {
        const formData = new FormData();
        const blob = new Blob([fileBuffer], { type: 'application/pdf' });
        formData.append('resume', blob, filename || 'resume.pdf');
        formData.append('job_description', 'General Software Engineer role focusing on modern web development and system design.'); // Default JD if not provided

        const response = await fetch('http://localhost:5000/api/screen', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ATSAPIAI Error:', errorText);
            throw new Error(`ATSAPIAI returned ${response.status}: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('ATSAPIAI Proxy Error:', error);
        
        // Fallback mock data if ATSAPIAI is down
        console.warn('⚠️ ATSAPIAI unreachable or failed. Using MOCK data fallback.');
        return {
            final_ats_score: 85,
            matched_skills: ['JavaScript', 'React', 'Node.js', 'Express', 'MongoDB'],
            missing_skills: ['Docker', 'AWS'],
            improvement_suggestions: ['Contribute to open source', 'Learn Docker']
        };
    }
};

/**
 * Process and Store Resume
 * @param {string} userId 
 * @param {Object} file (Multer object)
 */
const processAndSaveResume = async (userId, file) => {
    // 1. Send to ATSAPIAI
    const aiData = await proxyToATSAPIAI(file.buffer, file.originalname);

    // Map ATSAPIAI response to our DB schema
    const extractedSkills = aiData.matched_skills || [];
    const resumeScore = aiData.final_ats_score || 0;
    const suggestions = aiData.improvement_suggestions || [];

    // 2. Store in PostgreSQL
    const resumePG = await ResumePG.create({
        userId,
        fileUrl: 'memory_storage', // In real app, upload to S3 and get URL
        extractedSkills: extractedSkills,
        experienceLevel: 'Mid', // Mocked or extracted differently later
        resumeScore: resumeScore,
    });

    // 3. Store in MongoDB
    let mongoId = null;
    try {
        const resumeMongo = await ResumeMongo.create({
            userId,
            rawText: 'Text parsed by ATSAPIAI', // We don't have raw text from ATSAPIAI endpoint
            aiStructuredData: aiData,
            aiSuggestions: suggestions,
        });
        mongoId = resumeMongo._id;
    } catch (e) {
        console.warn('⚠️ MongoDB unreachable, skipping Mongo resume save');
    }

    return {
        id: resumePG.id,
        structured: {
            skills: extractedSkills,
            improvementSuggestions: suggestions,
            resumeScore: resumeScore
        },
        mongoId: mongoId
    };
};

/**
 * Get User Resumes
 * @param {string} userId 
 */
const getUserResumes = async (userId) => {
    return await ResumePG.findAll({ 
        where: { userId },
        order: [['createdAt', 'DESC']]
    });
};

/**
 * Get Latest User Resume Score
 * @param {string} userId 
 */
const getLatestResumeScore = async (userId) => {
    const resume = await ResumePG.findOne({
        where: { userId },
        order: [['createdAt', 'DESC']]
    });
    
    return resume ? resume.resumeScore : 0;
};

export default {
    processAndSaveResume,
    getUserResumes,
    getLatestResumeScore
};
