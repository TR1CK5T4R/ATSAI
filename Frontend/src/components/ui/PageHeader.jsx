
const PageHeader = ({ title, description, actions }) => (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
        <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
            {description && <p className="text-muted mt-1.5">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
);

export default PageHeader;
