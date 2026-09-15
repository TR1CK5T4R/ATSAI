import { FiCompass } from 'react-icons/fi';
import Navbar from '../components/layout/Navbar';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';

const NotFound = () => (
    <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-16">
            <EmptyState
                icon={FiCompass}
                title="Page not found"
                description="The page you're looking for doesn't exist or has moved."
                action={<Button to="/">Go home</Button>}
            />
        </main>
    </div>
);

export default NotFound;
