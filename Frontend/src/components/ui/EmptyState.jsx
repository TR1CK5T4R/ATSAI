import Card from './Card';

const EmptyState = ({ icon: Icon, title, description, action }) => (
    <Card className="flex flex-col items-center text-center py-12 sm:py-16">
        {Icon && (
            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-muted mb-4">
                <Icon className="w-6 h-6" />
            </div>
        )}
        <h3 className="text-lg font-semibold">{title}</h3>
        {description && <p className="text-muted mt-1 max-w-md">{description}</p>}
        {action && <div className="mt-6">{action}</div>}
    </Card>
);

export default EmptyState;
