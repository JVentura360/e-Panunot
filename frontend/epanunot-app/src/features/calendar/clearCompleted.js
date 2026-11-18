// src/features/calendar/clearCompleted.js
// Agenda "Clear completed" action. Deletes the signed-in student's own finished
// personal tasks and personal events that already ended. Class tasks, class
// events and announcements are never touched.
//
// api() refreshes the cached /calendar and /personal-todos lists after the call,
// so the agenda updates by itself. Throws on failure, for the confirm pop-up.
import { api } from '../../api/client.js';

export async function clearCompletedPersonal() {
  const result = await api('/personal-todos/clear-completed', { method: 'POST' });
  return { tasks: result?.data?.tasks ?? 0, events: result?.data?.events ?? 0 };
}

export function clearedMessage({ tasks, events }) {
  if (!tasks && !events) return 'Nothing to clear. You have no completed personal tasks or past personal events.';
  const parts = [];
  if (tasks) parts.push(`${tasks} completed task${tasks === 1 ? '' : 's'}`);
  if (events) parts.push(`${events} past event${events === 1 ? '' : 's'}`);
  return `Cleared ${parts.join(' and ')}.`;
}
