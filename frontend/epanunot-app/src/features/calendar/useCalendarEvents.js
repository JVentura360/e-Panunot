// src/features/calendar/useCalendarEvents.js
// Loads calendar events from the API and gives back create / update / remove.
// Nothing is kept in localStorage or component state: the database is the source
// of truth, so every device sees the same events.
import { useMemo } from 'react';
import { api } from '../../api/client.js';
import { useApiQuery } from '../../api/useApiQuery.js';
import { toCalendarEvent, toEventPayload } from './calendarMapper.js';

export function useCalendarEvents({ from, to, enabled = true }) {
  const query = useApiQuery('/calendar', {
    query: { from, to },
    enabled,
    placeholderData: (previous) => previous, // keep showing the old month while the next one loads
  });

  // /calendar also returns class tasks, but those already come from TaskContext,
  // so keep only the events here to avoid showing every task twice.
  const events = useMemo(
    () => (query.data?.data ?? []).filter((row) => row.kind === 'event').map(toCalendarEvent),
    [query.data]
  );

  // api() refreshes the cached /calendar list after each write, so the screen updates by itself.
  // All three throw on failure: the form that called them shows errorMessage(err).
  const createEvent = (values) => api('/calendar-events', { method: 'POST', body: toEventPayload(values) });
  const updateEvent = (rawId, values) => api(`/calendar-events/${rawId}`, { method: 'PUT', body: toEventPayload(values) });
  const removeEvent = (rawId) => api(`/calendar-events/${rawId}`, { method: 'DELETE' });

  return {
    events,
    loading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createEvent,
    updateEvent,
    removeEvent,
  };
}
