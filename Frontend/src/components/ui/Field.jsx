import { forwardRef } from 'react';
import clsx from 'clsx';

export const inputClass =
    'w-full bg-background border border-border rounded-xl h-11 px-3.5 text-sm placeholder:text-muted/60 ' +
    'focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-transparent transition-shadow';

/**
 * Labelled form field. Works with react-hook-form's register() via ref forwarding.
 * Pass `as="textarea"` or `as="select"` for other controls.
 */
const Field = forwardRef(({ label, error, icon: Icon, as: Tag = 'input', className, id, children, ...props }, ref) => {
    const fieldId = id || props.name;
    return (
        <div className={className}>
            {label && (
                <label htmlFor={fieldId} className="block text-sm font-medium mb-1.5">
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted w-4 h-4 pointer-events-none" />}
                <Tag
                    ref={ref}
                    id={fieldId}
                    aria-invalid={Boolean(error)}
                    className={clsx(inputClass, Icon && 'pl-10', Tag === 'textarea' && 'h-auto py-2.5 min-h-24', error && 'ring-2 ring-danger/50')}
                    {...props}
                >
                    {children}
                </Tag>
            </div>
            {error && <p className="text-danger text-xs mt-1.5">{error}</p>}
        </div>
    );
});

Field.displayName = 'Field';

export default Field;
