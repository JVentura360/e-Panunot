import { taskCalendarLink, eventCalendarLink } from './taskCalendarLink.js';

export default function TaskCalendarLink({ task, email, className }) {
  const isEvent = task.kind === 'event';
  const href = isEvent ? eventCalendarLink(task, email) : taskCalendarLink(task, email);
  if (!href) return null;
  return <a className={className} href={href} target="_blank" rel="noopener noreferrer" data-online-only
    title={isEvent ? 'Opens an event draft with the scheduled date and time. Press Save in Google Calendar.' : 'Opens an event draft on the due date. Press Save in Google Calendar.'}
    aria-label={`Add ${task.title} to your Google Calendar (opens a draft to review and save)`}>Add to Google Calendar</a>;
}
