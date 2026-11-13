export function deadlineDate(value) {
  if (!value) return new Date(NaN);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T23:59:00`);
  const text = String(value).replace(' ', 'T');
  return new Date(/[zZ]$|[+-]\d{2}:\d{2}$/.test(text) ? text : `${text}Z`);
}

export function deadlineInput(value) {
  const date = deadlineDate(value);
  if (!Number.isFinite(date.getTime())) return '';
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function deadlinePayload(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Choose a deadline date and time.');
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('Choose a valid deadline date and time.');
  return date.toISOString();
}
