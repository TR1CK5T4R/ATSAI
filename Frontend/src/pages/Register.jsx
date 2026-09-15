import { useForm, useWatch } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiMail, FiLock, FiBriefcase, FiUserCheck } from 'react-icons/fi';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import { authApi } from '../api/auth.api';
import AuthShell from '../components/layout/AuthShell';
import Field from '../components/ui/Field';
import Button from '../components/ui/Button';

// Admin accounts are created server-side (npm run create:admin), never self-registered
const ROLE_OPTIONS = [
    { value: 'candidate', label: 'Candidate', hint: 'Practise interviews', icon: FiUserCheck },
    { value: 'recruiter', label: 'Recruiter', hint: 'Review candidates', icon: FiBriefcase },
];

const Register = () => {
    const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm({
        defaultValues: { role: 'candidate' },
    });
    const setSession = useAuthStore((s) => s.setSession);
    const navigate = useNavigate();
    const role = useWatch({ control, name: 'role' });

    const onSubmit = async (data) => {
        try {
            const { user, accessToken } = await authApi.register(data);
            setSession(user, accessToken);
            toast.success('Account created!');
            navigate(user.role === 'candidate' ? '/resume' : '/dashboard', { replace: true });
        } catch (err) {
            toast.error(err.message);
        }
    };

    return (
        <AuthShell
            title="Create your account"
            subtitle="Start practising with an AI interviewer in minutes"
            footer={<>Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link></>}
        >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <fieldset>
                    <legend className="block text-sm font-medium mb-1.5">I am a</legend>
                    <div className="grid grid-cols-2 gap-2">
                        {ROLE_OPTIONS.map(({ value, label, hint, icon: Icon }) => (
                            <label
                                key={value}
                                className={clsx(
                                    'cursor-pointer rounded-xl border p-3 transition-colors',
                                    role === value ? 'border-primary bg-primary/10' : 'border-border hover:border-muted/50'
                                )}
                            >
                                <input type="radio" value={value} className="sr-only" {...register('role')} />
                                <Icon className={clsx('mb-1.5', role === value ? 'text-primary' : 'text-muted')} />
                                <span className="block text-sm font-medium">{label}</span>
                                <span className="block text-xs text-muted">{hint}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>

                <Field
                    label="Full name"
                    icon={FiUser}
                    autoComplete="name"
                    placeholder="Ada Lovelace"
                    error={errors.name?.message}
                    {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'At least 2 characters' } })}
                />
                <Field
                    label="Email"
                    type="email"
                    icon={FiMail}
                    autoComplete="email"
                    placeholder="name@company.com"
                    error={errors.email?.message}
                    {...register('email', {
                        required: 'Email is required',
                        pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
                    })}
                />
                <Field
                    label="Password"
                    type="password"
                    icon={FiLock}
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    error={errors.password?.message}
                    {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'At least 6 characters' } })}
                />
                <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
                    Create account
                </Button>
            </form>
        </AuthShell>
    );
};

export default Register;
