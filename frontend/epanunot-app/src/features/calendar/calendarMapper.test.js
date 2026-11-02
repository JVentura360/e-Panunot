import test from 'node:test';
import assert from 'node:assert/strict';
import { toCalendarEvent, toEventPayload, gridRange } from './calendarMapper.js';

test('an API event becomes the shape the calendar draws', () => {
  const starts = new Date(2026, 10, 3, 9, 0);
  const ends = new Date(2026, 10, 3, 10, 30);
  const event = toCalendarEvent({
    id: 7, kind: 'event', type: 'class', title: 'Review session',
    subject: { id: 4, code: 'IT 101', name: 'Intro' },
    starts_at: starts.toISOString(), ends_at: ends.toISOString(), can_edit: true,
  });
  assert.equal(event.id, 'e-7');
  assert.equal(event.rawId, 7);
  assert.equal(event.date, '2026-11-03');
  assert.equal(event.start, '09:00');
  assert.equal(event.end, '10:30');
  assert.equal(event.subject, 'IT 101 — Intro');
  assert.equal(event.canEdit, true);
});

test('form values become an ISO request body, personal by default', () => {
  const body = toEventPayload({ title: '  Study  ', date: '2026-11-03', start: '09:00', end: '10:00', subjectId: 4 });
  assert.equal(body.title, 'Study');
  assert.equal(body.scope, 'personal');
  assert.equal(body.subject_id, null); // subject only applies to class events
  assert.equal(new Date(body.starts_at).getTime(), new Date(2026, 10, 3, 9, 0).getTime());
  assert.equal(new Date(body.ends_at).getTime(), new Date(2026, 10, 3, 10, 0).getTime());
});

test('class events send scope "block" and the subject', () => {
  const body = toEventPayload({ title: 'Quiz', date: '2026-11-03', start: '09:00', end: '10:00', subjectId: 4, shareWithBlock: true });
  assert.equal(body.scope, 'block');
  assert.equal(body.subject_id, 4);
});

test('the month grid range stays inside the 93 day limit', () => {
  const days = Array.from({ length: 42 }, (_, i) => new Date(2026, 9, 25 + i));
  const { from, to } = gridRange(days);
  assert.ok((new Date(to) - new Date(from)) / 86400000 < 93);
});
