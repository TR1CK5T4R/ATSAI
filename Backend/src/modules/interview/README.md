# 🤖 AI Interview Engine

This module powers the real-time technical interview experience. It uses OpenAI to generate questions, evaluate answers, and provide comprehensive feedback.

## 🚀 Features

- **Context-Aware**: Starts based on the candidate's Resume and applied Role.
- **Real-time Evaluation**: Every answer is scored (0-100) with immediate feedback.
- **Adaptive**: Generates the next question based on the conversation history.
- **Comprehensive Report**: Final output includes:
  - Overall Score
  - Strengths & Weaknesses
  - Skill Breakdown
  - Recommended Courses

## 🛠️ Components

- **PostgreSQL**: Stores session state (`ongoing`/`completed`) and final scores.
- **MongoDB**: Stores the full chat log (`messages` array) with all AI/User interactions.
- **OpenAI (GPT-4)**: The core intelligence for questioning and grading.

## 🧪 API Usage

### 1. Start Interview
- **URL**: `POST /api/interview/start`
- **Body**: `{ "roleApplied": "Backend Engineer" }`
- **Response**: `{ "sessionId": "...", "question": "..." }`

### 2. Submit Answer
- **URL**: `POST /api/interview/answer`
- **Body**: `{ "sessionId": "...", "answer": "My answer..." }`
- **Response**: `{ "nextQuestion": "...", "evaluation": { "score": 85, "feedback": "Good..." } }`

### 3. Complete Interview
- **URL**: `POST /api/interview/complete`
- **Body**: `{ "sessionId": "..." }`
- **Response**: Full JSON report with course recommendations.
