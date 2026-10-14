import clsx from 'clsx';

const Spinner = ({ className }) => (
    <span
        role="status"
        aria-label="Loading"
        className={clsx('inline-block rounded-full border-2 border-current border-t-transparent animate-spin', className || 'w-5 h-5')}
    />
);

/** Centered spinner for whole-page loading states */
export const PageLoader = ({ label = 'Loading…', fullScreen = false }) => (
    <div className={clsx('flex flex-col items-center justify-center gap-3 text-muted', fullScreen ? 'min-h-screen bg-background' : 'py-24')}>
        <Spinner className="w-8 h-8 text-primary" />
        <p className="text-sm">{label}</p>
    </div>
);

export default Spinner;
