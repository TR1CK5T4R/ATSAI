import { useEffect } from 'react';
import { FiX } from 'react-icons/fi';

/** Accessible-enough modal: Esc closes, backdrop click closes, scrolls on small screens */
const Modal = ({ open, title, onClose, children }) => {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => e.key === 'Escape' && onClose();
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-surface border border-border rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <button onClick={onClose} className="p-2 -mr-2 rounded-lg text-muted hover:text-text hover:bg-white/5" aria-label="Close">
                        <FiX />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
};

export default Modal;
