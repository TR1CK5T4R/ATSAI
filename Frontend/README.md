# AI ATS Frontend

Production-ready React frontend for the AI ATS platform. Built with Vite, Tailwind CSS v4, and Zustand.

## 🚀 Tech Stack

- **Framework**: React 19 (Vite)
- **Styling**: Tailwind CSS v4 (Dark Theme)
- **State Management**: Zustand (Persisted Auth)
- **Routing**: React Router v7
- **HTTP Client**: Axios (with Interceptors)
- **Animations**: GSAP, Framer Motion
- **UI Components**: React Icons, React Hot Toast

## 🛠️ Setup & Run

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start Development Server**:
    ```bash
    npm run dev
    ```
    Runs on `http://localhost:5173`.

3.  **Build for Production**:
    ```bash
    npm run build
    ```

## 📂 Project Structure

```
src/
├── api/            # Axios setup & interceptors
├── store/          # Zustand stores (Auth)
├── components/
│   ├── layout/     # Sidebar, ProtectedRoute
│   └── ui/         # Reusable UI components
├── pages/          # Application pages
├── App.jsx         # Routing configuration
└── main.jsx        # Entry point
```

## 🎨 Theme Customization

Tailwind v4 configuration is in `src/index.css` using the `@theme` directive.
Colors: `background`, `surface`, `primary`, `secondary`, `accent`.
