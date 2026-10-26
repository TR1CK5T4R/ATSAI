# 🤖 AI ATS with Speech-to-Speech Interview Engine

An AI-powered Applicant Tracking System (ATS) that enables recruiters to conduct real-time voice interviews, manage candidates, and evaluate interview performance through an intuitive web platform.

## 🔑 Demo Accounts

Use these accounts to explore the project without registering:

| Role | Email | Password | What you can try |
|------|-------|----------|------------------|
| 👤 Candidate | `candidate@demo.com` | `Demo@1234` | Upload a resume, take a voice interview, view results and course suggestions |
| 🧑‍💼 Interviewer (Recruiter) | `interviewer@demo.com` | `Demo@1234` | Browse candidates, review interview scores, leave feedback |

> These are shared public accounts — please don't upload personal data. You can also register your own candidate or recruiter account from the sign-up page.

### 📄 Sample Resume

No resume handy? Use the fictional sample resume: **[demo-resume.pdf](Frontend/public/demo-resume.pdf)** (also served by the running app at `/demo-resume.pdf`).

Suggested walkthrough:
1. Log in as the **candidate**, go to **Resume**, and upload `demo-resume.pdf` — the AI parses skills, experience and seniority.
2. Go to **Interview** and take the voice interview (Chrome recommended for the Web Speech API; allow microphone access).
3. Open **Results** to see the score, strengths vs. gaps, and course suggestions.
4. Log out, log in as the **interviewer**, open **Candidates**, and review the candidate's interview and leave feedback.

Running locally? Create the demo accounts with:

```bash
cd Backend
npm run seed:demo
```

## 🚀 Features

- 🎤 Real-time speech-to-speech interviews using the Web Speech API
- 👤 Secure authentication (JWT + bcrypt)
- 📄 Resume upload, AI parsing and candidate management
- 💬 Live voice interaction
- 📊 Recruiter dashboard
- 📈 Candidate evaluation and feedback
- 📚 Course recommendations for skill gaps
- 🔒 Role-based access control (candidate, recruiter, admin)
- ⚡ RESTful API architecture
- 🗂 Hybrid database (PostgreSQL + MongoDB)

## 🛠 Tech Stack

| Layer | Technologies |
|-------|--------------|
| Frontend | React.js, Vite, Tailwind CSS, React Router, Axios |
| Backend | Node.js, Express.js, JWT, bcrypt, Joi |
| Databases | PostgreSQL (Sequelize), MongoDB |
| AI / APIs | Google Gemini, Web Speech API |

## 📂 Project Structure

```
ATS
├── Frontend/
│   └── src/
│       ├── api/          # Axios API clients
│       ├── components/
│       ├── constants/
│       ├── hooks/
│       ├── pages/
│       ├── store/
│       └── utils/
│
├── Backend/
│   ├── seeders/          # createAdmin, seedCourses, seedDemoUsers
│   ├── tests/
│   └── src/
│       ├── config/
│       ├── middleware/
│       ├── models/
│       ├── modules/      # users, resume, interview, courses, ...
│       ├── routes/
│       ├── services/
│       └── utils/
│
└── README.md
```

## ⚙️ Getting Started

**Prerequisites:** Node.js, PostgreSQL, MongoDB, and a Gemini API key (or set `GEMINI_MOCK=true`).

```bash
# Backend
cd Backend
cp .env.example .env        # fill in DATABASE_URL, MONGO_URI, JWT secrets, GEMINI_API_KEY
npm install
npm run seed:courses        # optional: sample courses
npm run seed:demo           # optional: demo candidate + interviewer accounts
npm run dev                 # http://localhost:3001

# Frontend
cd Frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

To create an admin account (admins can't self-register):

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='S3cure!pass' npm run create:admin
```

## ✨ Key Functionalities

### 👨‍💼 Candidate Portal
- User registration and login
- Resume upload
- Participate in voice interviews
- View interview history and results

### 🧑‍💼 Recruiter Portal
- Recruiter authentication
- Manage candidates
- Review candidate performance
- Leave interview feedback

### 🎙 AI Interview Engine
- Voice-to-text conversion
- Text-to-speech responses
- Real-time conversation flow
- Interview session management
- Low-latency speech processing

### 🔐 Authentication
- JWT access tokens + refresh tokens
- Password hashing using bcrypt
- Protected routes
- Role-based authorization

## 📊 Database Design

**PostgreSQL** stores structured data: users, recruiters, interviews, feedback, courses.

**MongoDB** stores unstructured data: interview chat logs, speech transcripts, conversation history.

## ⚡ REST APIs

Examples include:

```
POST   /auth/register
POST   /auth/login

GET    /candidate/profile
PUT    /candidate/profile

POST   /interview/create
GET    /interview/:id

POST   /feedback/add

POST   /resume/upload
```

## 📈 Future Improvements

- Video interview support
- Email notifications
- Interview scheduling
- Interview analytics dashboard

## 👨‍💻 Author

**Tushar Singla**

- GitHub: https://github.com/TR1CK5T4R
- LinkedIn: https://linkedin.com/in/615-tushar
