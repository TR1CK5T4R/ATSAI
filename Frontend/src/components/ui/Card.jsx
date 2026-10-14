import clsx from 'clsx';

const Card = ({ className, children, ...props }) => (
    <div className={clsx('bg-surface border border-border rounded-2xl p-5 sm:p-6', className)} {...props}>
        {children}
    </div>
);

export const StatCard = ({ label, value, hint, icon: Icon, tone = 'primary' }) => {
    const tones = {
        primary: 'text-primary bg-primary/10',
        secondary: 'text-secondary bg-secondary/10',
        accent: 'text-accent bg-accent/10',
        warning: 'text-warning bg-warning/10',
    };
    return (
        <Card className="flex items-start gap-4">
            {Icon && (
                <div className={clsx('w-11 h-11 shrink-0 rounded-xl flex items-center justify-center', tones[tone])}>
                    <Icon className="w-5 h-5" />
                </div>
            )}
            <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1 truncate">{value}</p>
                {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
            </div>
        </Card>
    );
};

export default Card;
