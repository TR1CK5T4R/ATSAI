# Frontend Libraries

| Library | Used for | Why this one |
|---------|----------|--------------|
| **react** (v19) + **react-dom** | UI | Component model with a large ecosystem |
| **vite** + **@vitejs/plugin-react** | Dev server / bundler | Fast HMR and simple config |
| **tailwindcss** (v4) + **@tailwindcss/vite** | Styling | Utility-first, with no separate CSS files per component |
| **clsx** + **tailwind-merge** | Conditional class names | Combine Tailwind classes without conflicts |
| **react-router-dom** (v7) | Routing + protected routes | Standard SPA router. `ProtectedRoute` guards authenticated pages |
| **axios** | HTTP client | Interceptors attach the JWT and refresh it on 401 (`src/api/axios.js`) |
| **zustand** | Global state (auth, session) | Tiny, has no provider boilerplate, and is easier than Redux for this scale |
| **react-hook-form** | Forms (login, register) | Lightweight forms with few re-renders |
| **react-hot-toast** | Notifications | Simple toast API |
| **socket.io-client** | Realtime interview channel | Installed to pair with the backend Socket.io, but **not imported anywhere yet** |
| **recharts** | Score / skill charts on Results | Declarative React charts |
| **react-markdown** | Render AI chat messages (`ChatMessage.jsx`) | Gemini replies may contain markdown |
| **framer-motion**, **gsap**, **locomotive-scroll** | Animations / smooth scroll on the landing page | Visual polish only. Avoid using them in core flows |
| **react-confetti** | Celebration on results | Polish |
| **react-icons** | Icons | One package covers many icon sets |
| **react-use** | Utility hooks | Common hooks without writing our own |

## Browser APIs
- **Web Speech API**: `SpeechRecognition` (speech → text) and `speechSynthesis` (text → speech), wrapped in `src/hooks/useSpeech.js`. It is free and needs no server-side speech service. Recognition works best in Chrome and Edge.
