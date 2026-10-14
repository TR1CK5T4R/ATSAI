import { Link } from 'react-router-dom';
import { FiCpu } from 'react-icons/fi';

/** Shared frame for Login/Register: centered card on a soft gradient */
const AuthShell = ({ title, subtitle, children, footer }) => (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[48rem] h-[48rem] rounded-full bg-primary/10 blur-[120px]" />
        <Link to="/" className="relative flex items-center gap-2 font-bold text-lg mb-8">
            <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white">
                <FiCpu />
            </span>
            AI <span className="text-primary -ml-1">ATS</span>
        </Link>
        <div className="relative w-full max-w-md bg-surface/90 backdrop-blur border border-border rounded-2xl p-6 sm:p-8 shadow-2xl">
            <h1 className="text-2xl font-bold">{title}</h1>
            {subtitle && <p className="text-muted mt-1 mb-7">{subtitle}</p>}
            {children}
        </div>
        {footer && <p className="relative text-sm text-muted mt-6">{footer}</p>}
    </div>
);

export default AuthShell;
