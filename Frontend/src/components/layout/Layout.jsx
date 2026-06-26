import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { FiHome, FiUpload, FiMessageSquare, FiAward, FiBook, FiLogOut, FiLayout } from 'react-icons/fi';
import clsx from 'clsx';

const SidebarItem = ({ to, icon: Icon, label }) => {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <Link
            to={to}
            className={clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:bg-surface hover:text-text"
            )}
        >
            <Icon className={clsx("w-5 h-5", isActive ? "text-primary" : "group-hover:text-text")} />
            <span className="font-medium">{label}</span>
        </Link>
    );
};

const Layout = () => {
    const logout = useAuthStore((state) => state.logout);
    const user = useAuthStore((state) => state.user);

    return (
        <div className="flex h-screen bg-background text-text overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-surface border-r border-border flex flex-col hidden md:flex">
                <div className="p-6">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        AI ATS
                    </h1>
                </div>

                <nav className="flex-1 px-4 space-y-2">
                    <SidebarItem to="/dashboard" icon={FiLayout} label="Dashboard" />
                    <SidebarItem to="/resume" icon={FiUpload} label="Resume Upload" />
                    <SidebarItem to="/interview" icon={FiMessageSquare} label="AI Interview" />
                    <SidebarItem to="/results" icon={FiAward} label="Results" />
                    <SidebarItem to="/courses" icon={FiBook} label="Courses" />
                </nav>

                <div className="p-4 border-t border-border">
                    <div className="flex items-center gap-3 px-4 py-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                            {user?.name?.[0] || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user?.name}</p>
                            <p className="text-xs text-muted truncate">{user?.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                        <FiLogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative">
                <div className="max-w-7xl mx-auto p-6 md:p-10">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default Layout;
