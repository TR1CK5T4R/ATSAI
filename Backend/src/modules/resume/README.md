# 📄 Resume Upload & AI Parsing Module

This module allows users to upload PDF resumes, which are then parsed and analyzed by OpenAI to extract structured data and improvement suggestions.

## 🚀 Features

- **PDF Parsing**: Extracts raw text from uploaded PDF files.
- **AI Analysis**: Uses OpenAI (GPT-4) to extract:
  - Skills & Tech Stack
  - Experience Level
  - Strengths & Weaknesses
  - Improvement Suggestions
  - Resume Score (0-100)
- **Dual Storage**:
  - **PostgreSQL**: Stores structured queryable data (Skills, Score, Level).
  - **MongoDB**: Stores raw text and full AI JSON response (for logs/retraining).
- **Security**:
  - Max file size (5MB).
  - PDF file type validation.
  - JWT Authentication required.

## 🛠️ Setup

1.  **Environment Variables**:
    Ensure `.env` has:
    ```env
    OPENAI_API_KEY=sk-...
    MAX_FILE_SIZE=5242880 # 5MB in bytes
    ```

2.  **Dependencies**:
    Already installed: `multer`, `pdf-parse`, `openai`.

## 🧪 API Endpoints

### 1. Upload Resume
- **URL**: `POST /api/resume/upload`
- **Headers**:
  ```
  Authorization: Bearer <token>
  Content-Type: multipart/form-data
  ```
- **Body**:
  - `resume`: (File) The PDF file to upload.

- **Response**:
  ```json
  {
    "success": true,
    "message": "Resume analyzed successfully",
    "data": {
      "id": "uuid...",
      "structured": { ...AI JSON... },
      "mongoId": "objectId..."
    }
  }
  ```

### 2. Get My Resumes
- **URL**: `GET /api/resume/my`
- **Headers**:
  ```
  Authorization: Bearer <token>
  ```
- **Response**: List of your uploaded resumes/analyses from PostgreSQL.
