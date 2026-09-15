/** Small display helpers shared by pages */

export const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const scoreTone = (score) => {
    if (score === null || score === undefined) return 'neutral';
    if (score >= 75) return 'success';
    if (score >= 50) return 'warning';
    return 'danger';
};

export const formatPrice = (price, currency = 'USD') => {
    if (!price) return 'Free';
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(price);
    } catch {
        return `${price} ${currency}`;
    }
};

export const statusTone = (status) => ({ completed: 'success', ongoing: 'primary', cancelled: 'danger' }[status] || 'neutral');
