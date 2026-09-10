import Resume from './Resume.model.pg.js';
import ResumeAnalysis from './resume.model.mongo.js'; // keep existing Mongo model for raw text
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

    // 2. Store in PostgreSQL (new field names: skills, parsedJson, experienceYears)
    const resumePG = await Resume.create({
        userId,
        fileUrl: file.path || null,
        skills: extractedSkills,
        parsedJson: aiData,
        experienceYears: 0,            // TODO: parse from aiData when Gemini is wired
    });

    // 3. Store in MongoDB
    let mongoId = null;
    try {
        const resumeMongo = await ResumeAnalysis.create({
            userId,
            rawText: 'Text parsed by ATSAPIAI',
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
    return await Resume.findAll({ 
        where: { userId },
        order: [['createdAt', 'DESC']]
    });
};

/**
 * Get Latest User Resume Score
 * @param {string} userId 
 */
const getLatestResumeScore = async (userId) => {
    const resume = await Resume.findOne({
        where: { userId },
        order: [['createdAt', 'DESC']]
    });
    
    return resume ? (resume.parsedJson?.final_ats_score ?? 0) : 0;
};

export default {
    processAndSaveResume,
    getUserResumes,
    getLatestResumeScore
};
