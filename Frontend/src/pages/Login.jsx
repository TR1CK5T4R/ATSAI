import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiMail, FiLock } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import { authApi } from '../api/auth.api';
import AuthShell from '../components/layout/AuthShell';
import Field from '../components/ui/Field';
import Button from '../components/ui/Button';

const Login = () => {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
    const setSession = useAuthStore((s) => s.setSession);
    const navigate = useNavigate();
    const location = useLocation();

    const onSubmit = async (data) => {
        try {
            const { user, accessToken } = await authApi.login(data);
            setSession(user, accessToken);
            toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);
            navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
        } catch (err) {
            toast.error(err.message);
        }
    };

    return (
        <AuthShell
            title="Welcome back"
            subtitle="Sign in to continue to your dashboard"
            footer={<>New here? <Link to="/register" className="text-primary hover:underline">Create an account</Link></>}
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <Field
                    label="Email"
                    type="email"
                    icon={FiMail}
                    autoComplete="email"
                    placeholder="name@company.com"
                    error={errors.email?.message}
                    {...register('email', { required: 'Email is required' })}
                />
                <Field
                    label="Password"
                    type="password"
                    icon={FiLock}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    error={errors.password?.message}
                    {...register('password', { required: 'Password is required' })}
                />
                <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
                    Sign in
                </Button>
            </form>
        </AuthShell>
    );
};

export default Login;
