import OpenAI from 'openai';
import ApiError from '../../utils/ApiError.js';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Helper to check for valid key
const hasValidKey = () => {
    return process.env.OPENAI_API_KEY &&
        process.env.OPENAI_API_KEY !== 'your_openai_api_key' &&
        process.env.OPENAI_API_KEY !== 'your_secret_key';
};

const generateFirstQuestion = async (resumeData, roleApplied) => {
    if (!hasValidKey()) {
        console.warn('⚠️ OpenAI API Key missing/invalid. Using MOCK data.');
        return {
            question: `Could you describe your experience with ${roleApplied} and a challenging project you worked on?`,
            context: "Initial screening to understand background."
        };
    }

    try {
        const prompt = `
      You are an expert technical interviewer.
      Candidate applied for: ${roleApplied}.
      Resume Summary: ${JSON.stringify(resumeData)}.
      
      Generate the first interview question. Use a JSON format.
      {
        "question": "The question text",
        "context": "Why you asked this"
      }
    `;

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "system", content: "You are a JSON generator." }, { role: "user", content: prompt }],
            response_format: { type: "json_object" },
        });

        return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
        if (error.code === 'insufficient_quota' || error.type === 'insufficient_quota') {
            console.warn('⚠️ OpenAI Quota Exceeded. Using MOCK data.');
            return {
                question: `Could you describe your experience with ${roleApplied} and a challenging project you worked on?`,
                context: "Initial screening to understand background."
            };
        }
        console.error('AI genFirstQuestion Error:', error);
        throw new ApiError(502, 'AI generation failed');
    }
};

const evaluateAnswer = async (currentQuestion, userAnswer, roleApplied) => {
    if (!hasValidKey()) {
        return {
            score: 85,
            feedback: "That's a solid answer covering key points.",
            isSatisfactory: true,
            followUpNeeded: false
        };
    }

    try {
        const prompt = `
      Role: ${roleApplied}
      Question: "${currentQuestion}"
      Candidate Answer: "${userAnswer}"
      
      Evaluate the answer. Return strictly JSON:
      {
        "score": 0-100, // integer
        "feedback": "Short feedback string",
        "isSatisfactory": boolean,
        "followUpNeeded": boolean
      }
    `;

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "system", content: "You are a JSON generator." }, { role: "user", content: prompt }],
            response_format: { type: "json_object" },
        });

        return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
        if (error.code === 'insufficient_quota' || error.type === 'insufficient_quota') {
            return {
                score: 85,
                feedback: "That's a solid answer covering key points.",
                isSatisfactory: true,
                followUpNeeded: false
            };
        }
        console.error('AI evaluateAnswer Error:', error);
        throw new ApiError(502, 'AI evaluation failed');
    }
};

const generateNextQuestion = async (chatHistory) => {
    if (!hasValidKey()) {
        return {
            question: "How do you handle error handling in asynchronous operations?",
            context: "Deep dive into technical knowledge."
        };
    }

    try {
        const prompt = `
          Analyze the chat history and generate the next relevant technical question.
          History: ${JSON.stringify(chatHistory.slice(-6))} // Last 3 turns
          
          Return strictly JSON:
          {
            "question": "Next technical question",
            "context": "Context or topic"
          }
        `;

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "system", content: "You are a JSON generator." }, { role: "user", content: prompt }],
            response_format: { type: "json_object" },
        });

        return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
        if (error.code === 'insufficient_quota' || error.type === 'insufficient_quota') {
            return {
                question: "How do you handle error handling in asynchronous operations?",
                context: "Deep dive into technical knowledge."
            };
        }
        throw new ApiError(502, 'AI next question failed');
    }
};

const generateFinalReport = async (fullConversation) => {
    if (!hasValidKey()) {
        return {
            finalScore: 88,
            strengths: ["Communication", "Technical Knowledge"],
            weaknesses: ["System Design"],
            missingSkills: ["GraphQL"],
            skillBreakdown: { "React": 90, "Node.js": 85, "SQL": 80 },
            recommendedCourses: ["Advanced System Design", "GraphQL for Beginners"]
        };
    }

    try {
        const prompt = `
          Generate a final interview report based on this conversation.
          Conversation: ${JSON.stringify(fullConversation)}
          
          Return strictly JSON:
          {
            "finalScore": 0-100,
            "strengths": ["string"],
            "weaknesses": ["string"],
            "missingSkills": ["string"],
            "skillBreakdown": { "SkillName": score_int, ... },
            "recommendedCourses": ["Course Topic 1", "Course Topic 2"]
          }
        `;

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "system", content: "You are a JSON generator." }, { role: "user", content: prompt }],
            response_format: { type: "json_object" },
        });

        return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
        if (error.code === 'insufficient_quota' || error.type === 'insufficient_quota') {
            return {
                finalScore: 88,
                strengths: ["Communication", "Technical Knowledge"],
                weaknesses: ["System Design"],
                missingSkills: ["GraphQL"],
                skillBreakdown: { "React": 90, "Node.js": 85, "SQL": 80 },
                recommendedCourses: ["Advanced System Design", "GraphQL for Beginners"]
            };
        }
        throw new ApiError(502, 'AI report generation failed');
    }
};

export default {
    generateFirstQuestion,
    evaluateAnswer,
    generateNextQuestion,
    generateFinalReport
};
