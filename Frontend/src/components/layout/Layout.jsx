import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { PageLoader } from '../ui/Spinner';
import Navbar from './Navbar';

/** App shell for signed-in pages: sticky navbar + centered, padded content */
const Layout = () => (
    <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
            <Suspense fallback={<PageLoader />}>
                <Outlet />
            </Suspense>
        </main>
    </div>
);

export default Layout;
