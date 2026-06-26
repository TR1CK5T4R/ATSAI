import React, { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import toast from 'react-hot-toast';

const ProtectedRoute = () => {
    const { isAuthenticated, token } = useAuthStore();

    useEffect(() => {
        if (!isAuthenticated || !token) {
            toast.error('Please login to continue');
        }
    }, [isAuthenticated, token]);

    if (!isAuthenticated || !token) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;
