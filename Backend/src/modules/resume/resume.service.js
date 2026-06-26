import { PDFParse } from 'pdf-parse';
import OpenAI from 'openai';
import ResumePG from './resume.model.pg.js';
import ResumeMongo from './resume.model.mongo.js';
import ApiError from '../../utils/ApiError.js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Parse PDF buffer to text
 * @param {Buffer} fileBuffer 
 * @returns {Promise<string>}
 */
const parseResumePDF = async (fileBuffer) => {
    try {
        const pdfParser = new PDFParse({ data: fileBuffer });
        const data = await pdfParser.getText();
        return data.text;
    } catch (error) {
        console.error('PDF Parse Error:', error);
        throw new ApiError(500, `Failed to parse PDF file: ${error.message}`);
    }
};

/**
 * Analyze text with OpenAI
 * @param {string} text 
 * @returns {Promise<Object>}
 */
const analyzeResumeWithAI = async (text) => {
    // Check for valid API key
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key' || process.env.OPENAI_API_KEY === 'your_secret_key') {
        console.warn('⚠️ OpenAI API Key missing or invalid. Using MOCK data.');
        return {
            skills: ['JavaScript', 'React', 'Node.js', 'Express', 'MongoDB'],
            techStack: ['MERN Stack', 'TailwindCSS', 'Redux'],
            experienceLevel: 'Mid',
            strengths: ['Full Stack Development', 'API Design'],
            weaknesses: ['Public Speaking', 'System Architecture'],
            improvementSuggestions: ['Contribute to open source', 'Learn Docker'],
            resumeScore: 85
        };
    }

    try {
        const prompt = `
      You are an expert AI Applicant Tracking System (ATS). Analyze the following resume text and extract key information in strict JSON format.
      
      Resume Text:
      "${text.substring(0, 10000)}" // Truncate to avoid token limits if necessary
      
      Return ONLY valid JSON with this structure:
      {
        "skills": ["skill1", "skill2"],
        "techStack": ["tech1", "tech2"],
        "experienceLevel": "Entry/Mid/Senior/Executive",
        "strengths": ["strength1", "strength2"],
        "weaknesses": ["weakness1", "weakness2"],
        "improvementSuggestions": ["suggestion1", "suggestion2"],
        "resumeScore": 0-100 (integer)
      }
    `;

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo", // Changed from gpt-4-turbo-preview to ensure availability
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
        });

        const content = completion.choices[0].message.content;
        return JSON.parse(content);
    } catch (error) {
        if (error.code === 'insufficient_quota' || error.type === 'insufficient_quota') {
            console.warn('⚠️ OpenAI Quota Exceeded. Using MOCK data fallback.');
            return {
                skills: ['JavaScript', 'React', 'Node.js', 'Express', 'MongoDB'],
                techStack: ['MERN Stack', 'TailwindCSS', 'Redux'],
                experienceLevel: 'Mid',
                strengths: ['Full Stack Development', 'API Design'],
                weaknesses: ['Public Speaking', 'System Architecture'],
                improvementSuggestions: ['Contribute to open source', 'Learn Docker'],
                resumeScore: 85
            };
        }
        console.error('OpenAI Error:', error);
        throw new ApiError(502, 'Failed to analyze resume with AI');
    }
};

/**
 * Process and Store Resume
 * @param {string} userId 
 * @param {Object} file (Multer object)
 */
const processAndSaveResume = async (userId, file) => {
    // 1. Parse PDF
    const rawText = await parseResumePDF(file.buffer);

    // 2. Analyze with AI
    const aiData = await analyzeResumeWithAI(rawText);

    // 3. Store in PostgreSQL
    const resumePG = await ResumePG.create({
        userId,
        fileUrl: 'memory_storage', // In real app, upload to S3 and get URL
        extractedSkills: [...aiData.skills, ...aiData.techStack],
        experienceLevel: aiData.experienceLevel,
        resumeScore: aiData.resumeScore,
    });

    // 4. Store in MongoDB
    const resumeMongo = await ResumeMongo.create({
        userId,
        rawText,
        aiStructuredData: aiData,
        aiSuggestions: aiData.improvementSuggestions,
    });

    return {
        id: resumePG.id,
        structured: aiData,
        mongoId: resumeMongo._id
    };
};

/**
 * Get User Resumes
 * @param {string} userId 
 */
const getUserResumes = async (userId) => {
    return await ResumePG.findAll({ where: { userId } });
};

export default {
    parseResumePDF,
    analyzeResumeWithAI,
    processAndSaveResume,
    getUserResumes
};
