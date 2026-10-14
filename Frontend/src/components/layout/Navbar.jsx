/**
 * Navbar.jsx — Sticky top navigation, role-aware, responsive.
 *  - md+: inline links + user chip + sign out
 *  - <md: hamburger → slide-down panel (closes on navigation / Esc)
 *  - Signed-out (Landing): Sign in / Get started buttons
 */

import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FiMenu, FiX, FiLogOut, FiCpu } from 'react-icons/fi';
import clsx from 'clsx';
import { useAuthStore, selectIsAuthenticated } from '../../store/useAuthStore';
import { navItemsFor } from '../../constants/nav';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

const Logo = ({ to }) => (
    <Link to={to} className="flex items-center gap-2 font-bold text-lg tracking-tight shrink-0">
        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white">
            <FiCpu className="w-4 h-4" />
        </span>
        <span>
            AI <span className="text-primary">ATS</span>
        </span>
    </Link>
);

const linkClass = ({ isActive }) =>
    clsx(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive ? 'bg-primary/10 text-primary' : 'text-muted hover:text-text hover:bg-white/5'
    );

const Navbar = () => {
    const user = useAuthStore((s) => s.user);
    const isAuthenticated = useAuthStore(selectIsAuthenticated);
    const logout = useAuthStore((s) => s.logout);
    const navigate = useNavigate();
    const { pathname } = useLocation();
    // The menu remembers which path it was opened on, so navigating closes it automatically
    const [openedOn, setOpenedOn] = useState(null);
    const open = openedOn === pathname;
    const setOpen = (value) => setOpenedOn(value ? pathname : null);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => e.key === 'Escape' && setOpenedOn(null);
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open]);

    const items = isAuthenticated ? navItemsFor(user.role) : [];

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
            <nav className="max-w-7xl mx-auto h-16 px-4 sm:px-6 flex items-center gap-6">
                <Logo to={isAuthenticated ? '/dashboard' : '/'} />

                {/* Desktop links */}
                <div className="hidden md:flex items-center gap-1 flex-1">
                    {items.map(({ to, label, icon: Icon }) => (
                        <NavLink key={to} to={to} className={linkClass}>
                            <Icon className="w-4 h-4" /> {label}
                        </NavLink>
                    ))}
                </div>

                {/* Desktop right side */}
                <div className="hidden md:flex items-center gap-3 ml-auto">
                    {isAuthenticated ? (
                        <>
                            <div className="flex items-center gap-2.5 pl-3">
                                <span className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold">
                                    {user.name?.[0]?.toUpperCase() || 'U'}
                                </span>
                                <div className="leading-tight max-w-36">
                                    <p className="text-sm font-medium truncate">{user.name}</p>
                                    <p className="text-xs text-muted capitalize">{user.role}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="Sign out">
                                <FiLogOut />
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" size="sm" to="/login">Sign in</Button>
                            <Button size="sm" to="/register">Get started</Button>
                        </>
                    )}
                </div>

                {/* Mobile toggle */}
                <button
                    className="md:hidden ml-auto p-2 -mr-2 rounded-lg text-muted hover:text-text hover:bg-white/5"
                    onClick={() => setOpen(!open)}
                    aria-label={open ? 'Close menu' : 'Open menu'}
                    aria-expanded={open}
                >
                    {open ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
                </button>
            </nav>

            {/* Mobile panel */}
            {open && (
                <div className="md:hidden border-t border-border bg-background px-4 pb-4 pt-2 space-y-1">
                    {items.map(({ to, label, icon: Icon }) => (
                        <NavLink key={to} to={to} className={linkClass}>
                            <Icon className="w-4 h-4" /> {label}
                        </NavLink>
                    ))}
                    <div className="pt-3 mt-2 border-t border-border">
                        {isAuthenticated ? (
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{user.name}</p>
                                    <Badge className="mt-1 capitalize">{user.role}</Badge>
                                </div>
                                <Button variant="danger" size="sm" onClick={handleLogout}>
                                    <FiLogOut /> Sign out
                                </Button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="secondary" to="/login">Sign in</Button>
                                <Button to="/register">Get started</Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
};

export default Navbar;
