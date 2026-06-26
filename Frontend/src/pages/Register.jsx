import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { authApi } from '../api/auth.api';
import { FiUser, FiMail, FiLock, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';

const Register = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [isLoading, setIsLoading] = useState(false); // Local loading state
    const loginAction = useAuthStore((state) => state.loginAction);
    const navigate = useNavigate();

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            const response = await authApi.register(data);
            const { token, user } = response.data || response;

            if (token && user) {
                loginAction(user, token);
                toast.success('Account created successfully!');
                navigate('/dashboard');
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            toast.error(error.message || 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md bg-surface p-8 rounded-2xl border border-border shadow-2xl">
                <h2 className="text-3xl font-bold text-center mb-2">Create Account</h2>
                <p className="text-muted text-center mb-8">Join the AI-powered hiring platform</p>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Full Name</label>
                        <div className="relative">
                            <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                            <input
                                {...register("name", { required: "Name is required" })}
                                className="w-full bg-background border border-border rounded-lg py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="John Doe"
                            />
                        </div>
                        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
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
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <div className="relative">
                            <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                            <input
                                type="password"
                                {...register("password", { required: "Password is required", minLength: { value: 6, message: "Min 6 chars" } })}
                                className="w-full bg-background border border-border rounded-lg py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                        {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
                    </div>

                    <button
                        disabled={isLoading}
                        className="w-full bg-primary hover:bg-primary/90 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 mt-4"
                    >
                        {isLoading ? <><FiLoader className="animate-spin" /> Creating Account...</> : 'Sign Up'}
                    </button>
                </form>

                <p className="text-center text-sm text-muted mt-6">
                    Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
