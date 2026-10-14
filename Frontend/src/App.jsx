import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { useAuthStore } from './store/useAuthStore';
import { ALL_ROLES, ROLES, STAFF_ROLES } from './constants/nav';
import Layout from './components/layout/Layout';
import ProtectedRoute, { GuestRoute } from './components/layout/ProtectedRoute';

import { PageLoader } from './components/ui/Spinner';

// Route-level code splitting: heavy deps (gsap, recharts, confetti) load only where used
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ResumeUpload = lazy(() => import('./pages/ResumeUpload'));
const Interview = lazy(() => import('./pages/Interview'));
const Results = lazy(() => import('./pages/Results'));
const Courses = lazy(() => import('./pages/Courses'));
const Admin = lazy(() => import('./pages/Admin'));
const MockCheckout = lazy(() => import('./pages/MockCheckout'));
const NotFound = lazy(() => import('./pages/NotFound'));

const App = () => {
    const bootstrap = useAuthStore((s) => s.bootstrap);

    // Restore the session from the refresh cookie once on load
    useEffect(() => {
        bootstrap();
    }, [bootstrap]);

    return (
        <BrowserRouter>
            <Toaster
                position="top-right"
                toastOptions={{
                    style: { background: '#16161a', color: '#ededed', border: '1px solid #27272a', fontSize: '14px' },
                }}
            />

            <Suspense fallback={<PageLoader fullScreen />}>
            <Routes>
                <Route path="/" element={<Landing />} />

                <Route element={<GuestRoute />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                </Route>

                <Route element={<ProtectedRoute roles={ALL_ROLES} />}>
                    <Route element={<Layout />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/courses" element={<Courses />} />
                        <Route path="/checkout/mock" element={<MockCheckout />} />
                        {/* Staff open candidates' results from the Admin page (?id=) */}
                        <Route path="/results" element={<Results />} />

                        <Route element={<ProtectedRoute roles={[ROLES.candidate]} />}>
                            <Route path="/resume" element={<ResumeUpload />} />
                            <Route path="/interview" element={<Interview />} />
                        </Route>

                        <Route element={<ProtectedRoute roles={STAFF_ROLES} />}>
                            <Route path="/admin" element={<Admin />} />
                        </Route>
                    </Route>
                </Route>

                <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
        </BrowserRouter>
    );
};

export default App;
