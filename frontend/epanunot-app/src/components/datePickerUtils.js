export function dateKey(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

export function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  const result = new Date(year, month - 1, day);
  return dateKey(result) === value ? result : null;
}

export function monthDays(view) {
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  return Array.from({ length: 42 }, (_, index) => new Date(view.getFullYear(), view.getMonth(), 1 - first.getDay() + index));
}
