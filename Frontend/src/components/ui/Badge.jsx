import clsx from 'clsx';

const TONES = {
    neutral: 'bg-white/5 text-muted border-border',
    primary: 'bg-primary/10 text-primary border-primary/20',
    success: 'bg-secondary/10 text-secondary border-secondary/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    danger: 'bg-danger/10 text-danger border-danger/20',
    accent: 'bg-accent/10 text-accent border-accent/20',
};

const Badge = ({ tone = 'neutral', className, children }) => (
    <span className={clsx('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap', TONES[tone], className)}>
        {children}
    </span>
);

export default Badge;
