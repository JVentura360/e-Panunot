export const blockLabel = (block) => block?.code ?? '';

export const shortDate = (iso) =>
  new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });