import { Link } from 'react-router-dom';
import clsx from 'clsx';
import Spinner from './Spinner';

const VARIANTS = {
    primary: 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20',
    secondary: 'bg-surface-2 text-text border border-border hover:border-muted/50 hover:bg-surface-2/70',
    ghost: 'text-muted hover:text-text hover:bg-white/5',
    danger: 'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20',
};

const SIZES = {
    sm: 'h-9 px-3 text-sm gap-1.5',
    md: 'h-11 px-5 text-sm gap-2',
    lg: 'h-12 px-6 text-base gap-2',
};

/**
 * Button — renders a <Link> when `to` is given, otherwise a <button>.
 * `loading` disables the button and shows a spinner.
 */
const Button = ({ variant = 'primary', size = 'md', to, loading = false, disabled, className, children, ...props }) => {
    const classes = clsx(
        'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className
    );

    if (to) {
        return (
            <Link to={to} className={classes} {...props}>
                {children}
            </Link>
        );
    }

    return (
        <button className={classes} disabled={disabled || loading} {...props}>
            {loading && <Spinner className="w-4 h-4" />}
            {children}
        </button>
    );
};

export default Button;
