import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { authApi } from '../api/auth.api';
import { FiMail, FiLock, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Login = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [isLoading, setIsLoading] = useState(false);
    const loginAction = useAuthStore((state) => state.loginAction);
    const navigate = useNavigate();

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            const response = await authApi.login(data);
            // Access user and token from response.data (standard Axios) which is already stripped by authApi
            // response from api is typically { message, data: { user, token } } or just { user, token } depending on backend
            // Assuming backend returns { success: true, token, user } or similar.
            // Adjusting based on common practice: result is the data payload.

            // Let's assume the backend response structure is like:
            // { message: "...", data: { user: {...}, token: "..." } } OR { token: "...", user: {...} }
            // I'll assume safe destructuring

            const { token, user } = response.data || response;

            if (token && user) {
                loginAction(user, token);
                toast.success(`Welcome back, ${user.name}!`);
                navigate('/dashboard');
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            toast.error(error.message || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md bg-surface p-8 rounded-2xl border border-border shadow-2xl">
                <h2 className="text-3xl font-bold text-center mb-2">Welcome Back</h2>
                <p className="text-muted text-center mb-8">Sign in to continue to your dashboard</p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">Email</label>
                        <div className="relative">
                            <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                            <input
                                {...register("email", { required: "Email is required" })}
                                className="w-full bg-background border border-border rounded-lg py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="name@company.com"
                            />
                        </div>
                        {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Password</label>
                        <div className="relative">
                            <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                            <input
                                type="password"
                                {...register("password", { required: "Password is required" })}
                                className="w-full bg-background border border-border rounded-lg py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                        {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
                    </div>

                    <button
                        disabled={isLoading}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {isLoading ? <><FiLoader className="animate-spin" /> Signing In...</> : 'Sign In'}
                    </button>
                </form>

                <p className="text-center text-sm text-muted mt-6">
                    Don't have an account? <Link to="/register" className="text-primary hover:underline">Sign up</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
