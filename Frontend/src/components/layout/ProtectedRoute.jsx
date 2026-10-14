/**
 * ProtectedRoute.jsx — Auth + role guard for route groups
 *
 *   <Route element={<ProtectedRoute />}>                      signed-in users only
 *   <Route element={<ProtectedRoute roles={['admin']} />}>   + role check
 *
 * While the session is being restored (silent refresh on page load) it shows
 * a loader instead of bouncing the user to /login.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FiLock } from 'react-icons/fi';
import { useAuthStore } from '../../store/useAuthStore';
import { PageLoader } from '../ui/Spinner';
import EmptyState from '../ui/EmptyState';
import Button from '../ui/Button';

const ProtectedRoute = ({ roles }) => {
    const status = useAuthStore((s) => s.status);
    const user = useAuthStore((s) => s.user);
    const location = useLocation();

    if (status === 'idle' || status === 'checking') {
        return <PageLoader label="Restoring your session…" fullScreen />;
    }

    if (status !== 'authenticated') {
        // Remember where the user was going, so login can send them back
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    if (roles && !roles.includes(user.role)) {
        return (
            <EmptyState
                icon={FiLock}
                title="You don't have access to this page"
                description={`This area is for ${roles.join(' / ')} accounts. You're signed in as a ${user.role}.`}
                action={<Button to="/dashboard">Back to dashboard</Button>}
            />
        );
    }

    return <Outlet />;
};

/** Login/Register: signed-in users go straight to where they were heading */
export const GuestRoute = () => {
    const status = useAuthStore((s) => s.status);
    const location = useLocation();

    if (status === 'idle' || status === 'checking') {
        return <PageLoader label="Restoring your session…" fullScreen />;
    }
    if (status === 'authenticated') {
        return <Navigate to={location.state?.from?.pathname || '/dashboard'} replace />;
    }
    return <Outlet />;
};

export default ProtectedRoute;
