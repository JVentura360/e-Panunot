export const fmt = (d) => d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
export const daysLeft = (d) => Math.ceil((d - new Date()) / 864e5);
