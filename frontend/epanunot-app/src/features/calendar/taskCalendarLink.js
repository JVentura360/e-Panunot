import { deadlineDate } from '../../components/deadline.js';
const calendarDay = (date) => date.toISOString().slice(0, 10).replace(/-/g, '');
const calendarTime = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

export function eventCalendarLink(event, email) {
  const start = new Date(event.calendarStartsAt ?? `${event.date}T${event.start}`);
  let end = new Date(event.calendarEndsAt ?? `${event.date}T${event.end}`);
  if (!event.calendarEndsAt && end < start) end = new Date(end.getTime() + 86400000);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return null;
  const url = new URL('https://calendar.google.com/calendar/r/eventedit');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', event.title);
  url.searchParams.set('dates', `${calendarTime(start)}/${calendarTime(end)}`);
  url.searchParams.set('details', [event.subject, 'Event from ePanunot.'].filter(Boolean).join('\n'));
  if (email && !email.endsWith('.test')) url.searchParams.set('authuser', email);
  return url.toString();
}

export function taskCalendarLink(task, email) {
  if (task.calendarDeadline && !/^\d{4}-\d{2}-\d{2}$/.test(task.calendarDeadline)) {
    const deadline = deadlineDate(task.calendarDeadline);
    if (!Number.isFinite(deadline.getTime())) return null;
    const url = new URL('https://calendar.google.com/calendar/r/eventedit');
    url.searchParams.set('action', 'TEMPLATE');
    url.searchParams.set('text', task.title);
    url.searchParams.set('dates', `${calendarTime(deadline)}/${calendarTime(new Date(deadline.getTime() + 1800000))}`);
    url.searchParams.set('details', [task.subject, task.by ? `Assigned by ${task.by}` : '', task.platform ? `Platform: ${task.platform}` : '', 'Task deadline from ePanunot.'].filter(Boolean).join('\n'));
    if (email && !email.endsWith('.test')) url.searchParams.set('authuser', email);
    return url.toString();
  }
  const day = task.date ?? (typeof task.calendarDeadline === 'string' ? task.calendarDeadline.slice(0, 10) : null);
  const fallback = new Date(task.due);
  const start = day ? new Date(`${day}T00:00:00Z`) : new Date(Date.UTC(fallback.getFullYear(), fallback.getMonth(), fallback.getDate()));
  if (!Number.isFinite(start.getTime())) return null;
  if (day && start.toISOString().slice(0, 10) !== day) return null;
  const url = new URL('https://calendar.google.com/calendar/r/eventedit');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', task.title);
  // Date-only deadlines belong on the displayed day, independent of Google account timezone.
  url.searchParams.set('dates', `${calendarDay(start)}/${calendarDay(new Date(start.getTime() + 86400000))}`);
  url.searchParams.set('details', [task.subject, task.by ? `Assigned by ${task.by}` : '', task.platform ? `Platform: ${task.platform}` : '', 'Task deadline from ePanunot.'].filter(Boolean).join('\n'));
  if (email && !email.endsWith('.test')) url.searchParams.set('authuser', email);
  return url.toString();
}
