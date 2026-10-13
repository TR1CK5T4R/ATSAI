# Users & Authentication Module (`src/modules/users`)

This module provides user management, secure authentication, role-based authorization, and candidate profile management for the AI ATS platform.

---

## 🚀 Features

- **Password Security**: Passwords hashed using `bcrypt` with **12 salt rounds**. Plaintext passwords are never stored or logged.
- **Dual-Token Authentication**:
  - **Access Token**: Short-lived JWT (15 minutes expiry) passed via `Authorization: Bearer <token>`.
  - **Refresh Token**: Long-lived JWT (7 days expiry) stored securely in an `httpOnly`, `SameSite=Strict` cookie to prevent XSS attacks.
- **Role-Based Access Control (RBAC)**:
  - Supported roles: `candidate`, `recruiter`, `admin`.
  - Granular middleware `authorizeRoles('candidate', 'recruiter', 'admin')`.
- **Input Validation**: Robust Joi schema validation for all endpoints.
- **Candidate Profiles**: Candidates can retrieve and update their profiles (`GET /candidate/profile`, `PUT /candidate/profile`).

---

## 📂 Architecture

```
src/modules/users/
├── User.model.js         # Sequelize PostgreSQL model (UUID, 12 rounds bcrypt hooks, safe toJSON)
├── user.model.js         # Backward-compatibility re-export
├── users.service.js      # Core business logic: registration, credential validation, tokens, profiles
├── users.controller.js   # HTTP handlers with catchAsync and cookie management
├── users.validation.js   # Joi schemas for request bodies
├── users.routes.js       # Route definitions for auth, candidates, and users
└── README.md             # Module documentation
```

---

## ⚡ Endpoints

### 1. Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/auth/register` (also `/api/auth/register`) | Public | Register new user. Sets `refreshToken` cookie and returns `accessToken`. |
| `POST` | `/auth/login` (also `/api/auth/login`) | Public | Login with email and password. Sets `refreshToken` cookie and returns `accessToken`. |
| `POST` | `/auth/refresh` (also `/auth/refresh-token`) | Public | Exchange `refreshToken` cookie for new `accessToken`. |
| `POST` | `/auth/logout` | Public | Clears `refreshToken` cookie. |
| `GET` | `/auth/me` | Authenticated | Get current authenticated user details. |

### 2. Candidate Profile

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/candidate/profile` | Candidate only | Get the authenticated candidate's profile. |
| `PUT` | `/candidate/profile` | Candidate only | Update name, email, or password for the authenticated candidate. |

---

## 🔒 Security Best Practices

1. **Passwords**: Auto-hashed before saving via Sequelize `beforeCreate` and `beforeUpdate` hooks with `bcrypt` (12 rounds).
2. **Serialization**: `User.prototype.toJSON` automatically strips `passwordHash` to avoid leaking credentials.
3. **Cookies**: `refreshToken` is configured with `httpOnly: true`, `secure: production`, and `sameSite: strict`.
4. **Error Handling**: Uses `ApiError` to yield consistent JSON errors with correct HTTP status codes without leaking stack traces in production.
