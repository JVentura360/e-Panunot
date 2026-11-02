// src/features/calendar/calendarMapper.js
// Converts between the API's event shape (ISO timestamps) and the shape the
// Calendar screen draws ({ date: 'YYYY-MM-DD', start: 'HH:mm', end: 'HH:mm' }).
//
// The backend stores everything in UTC. The browser's own time zone is used to
// show and to send times, so an event saved as 09:00 in Manila comes back as
// 09:00 in Manila.

const pad = (n) => String(n).padStart(2, '0');

export const dateKeyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const timeOf = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** API row (kind: 'event') -> what Calendar.jsx renders. */
export function toCalendarEvent(row) {
  const starts = new Date(row.starts_at);
  const ends = new Date(row.ends_at);
  return {
    id: `e-${row.id}`,
    rawId: row.id,
    title: row.title,
    date: dateKeyOf(starts),
    start: timeOf(starts),
    end: timeOf(ends),
    type: row.type, // 'class' (shared with the block, synced to Google) | 'personal'
    subject: row.subject ? `${row.subject.code} — ${row.subject.name}` : '',
    subjectId: row.subject?.id ?? null,
    canEdit: Boolean(row.can_edit),
  };
}

/**
 * Form values -> request body for POST / PUT /calendar-events.
 * `scope` is only used on create (the backend ignores it on update).
 */
export function toEventPayload({ title, date, start, end, subjectId = null, shareWithBlock = false }) {
  return {
    title: title.trim(),
    scope: shareWithBlock ? 'block' : 'personal',
    subject_id: shareWithBlock ? subjectId : null,
    // new Date('2026-11-03T09:00') is read in the browser's time zone.
    starts_at: new Date(`${date}T${start}`).toISOString(),
    ends_at: new Date(`${date}T${end}`).toISOString(),
  };
}

/**
 * The window to ask /calendar for: the 42 cells of the month grid.
 * Every week of the cursor's month sits inside it, so one request covers the
 * month, week and agenda views. (The backend allows at most 93 days.)
 */
export function gridRange(monthDays) {
  const from = new Date(monthDays[0]);
  from.setHours(0, 0, 0, 0);
  const to = new Date(monthDays[monthDays.length - 1]);
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}
