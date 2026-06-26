🤖 AI ATS with Speech-to-Speech Interview Engine

An AI-powered Applicant Tracking System (ATS) that enables recruiters to conduct real-time voice interviews, manage candidates, and evaluate interview performance through an intuitive web platform.

🚀 Features
🎤 Real-time Speech-to-Speech Interviews using Web Speech API
👤 Secure Authentication (JWT + bcrypt)
📄 Resume Upload & Candidate Management
📅 Interview Scheduling
💬 Live Voice Interaction
📊 Recruiter Dashboard
📈 Candidate Evaluation & Feedback
🔒 Role-Based Access Control
⚡ RESTful API Architecture
🗂 Hybrid Database (PostgreSQL + MongoDB)
🛠 Tech Stack
Frontend
React.js
Tailwind CSS
React Router
Axios
Backend
Node.js
Express.js
JWT Authentication
bcrypt
REST APIs
Databases
PostgreSQL
MongoDB
APIs
Web Speech API
📂 Project Structure
AI-ATS
│
├── client/
│   ├── src/
│   ├── components/
│   ├── pages/
│   └── hooks/
│
├── server/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── models/
│   ├── config/
│   └── utils/
│
└── README.md
✨ Key Functionalities
👨‍💼 Candidate Portal
User Registration & Login
Resume Upload
View Scheduled Interviews
Participate in Voice Interviews
View Interview History
🧑‍💼 Recruiter Portal
Recruiter Authentication
Manage Candidates
Schedule Interviews
Conduct Voice Interviews
Review Candidate Performance
Leave Interview Feedback
🎙 AI Interview Engine
Voice-to-Text Conversion
Text-to-Speech Responses
Real-time Conversation Flow
Interview Session Management
Low-latency Speech Processing
🔐 Authentication
JWT Access Tokens
Password Hashing using bcrypt
Protected Routes
Role-Based Authorization
📊 Database Design
PostgreSQL

Stores structured data such as:

Users
Recruiters
Interviews
Interview Schedules
Feedback
MongoDB

Stores unstructured data including:

Interview Chat Logs
Speech Transcripts
Conversation History
⚡ REST APIs

Examples include:

POST   /auth/register
POST   /auth/login

GET    /candidate/profile
PUT    /candidate/profile

POST   /interview/create
GET    /interview/:id

POST   /feedback/add

POST   /resume/upload
💡 Highlights
Real-time speech-based interviews
Secure authentication system
Hybrid database architecture
RESTful backend
Responsive user interface
Modular and scalable codebase
📈 Future Improvements
AI-generated interview questions
Resume parsing
Automated candidate scoring
Video interview support
Email notifications
AI feedback generation
Interview analytics dashboard

👨‍💻 Author

Tushar Singla

GitHub: https://github.com/TR1CK5T4R
LinkedIn: https://linkedin.com/in/615-tushar
