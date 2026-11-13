import test from 'node:test';
import assert from 'node:assert/strict';
import { taskCalendarLink, eventCalendarLink } from './taskCalendarLink.js';

test('event drafts preserve exact timezone-aware start and end times across midnight', () => {
  const link = new URL(eventCalendarLink({ title: 'Evening seminar', subject: 'ITP-08 — Database Systems',
    calendarStartsAt: '2026-11-07T23:30:00+08:00', calendarEndsAt: '2026-11-08T01:00:00+08:00' }, 'student@udd.edu.ph'));
  assert.equal(link.searchParams.get('dates'), '20261107T153000Z/20261107T170000Z');
  assert.equal(link.searchParams.get('text'), 'Evening seminar');
  assert.match(link.searchParams.get('details'), /Database Systems/);
  assert.equal(link.searchParams.get('authuser'), 'student@udd.edu.ph');
});

test('cached events use local scheduled times and reject invalid ranges', () => {
  const event = { title: 'Review', date: '2026-11-07', start: '09:00', end: '10:00' };
  const link = new URL(eventCalendarLink(event));
  const compact = (date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  assert.equal(link.searchParams.get('dates'), `${compact(new Date('2026-11-07T09:00'))}/${compact(new Date('2026-11-07T10:00'))}`);
  assert.equal(eventCalendarLink({ ...event, start: 'invalid' }), null);
  assert.equal(eventCalendarLink({ ...event, calendarStartsAt: '2026-11-07T10:00:00Z', calendarEndsAt: '2026-11-07T09:00:00Z' }), null);
});

test('calendar draft preserves the precise deadline and keeps task details', () => {
  const link = new URL(taskCalendarLink({ title: 'Read A&B / chapter 2', calendarDeadline: '2026-11-07T15:59:00.000Z',
    subject: 'ITP-08 — Database Systems', by: 'Mayor', platform: 'StepS' }, 'student@udd.edu.ph'));
  assert.equal(link.origin, 'https://calendar.google.com');
  assert.equal(link.searchParams.get('action'), 'TEMPLATE');
  assert.equal(link.searchParams.get('text'), 'Read A&B / chapter 2');
  assert.equal(link.searchParams.get('dates'), '20261107T155900Z/20261107T162900Z');
  assert.match(link.searchParams.get('details'), /ITP-08 — Database Systems/);
  assert.match(link.searchParams.get('details'), /Assigned by Mayor/);
  assert.match(link.searchParams.get('details'), /Platform: StepS/);
  assert.equal(link.searchParams.get('authuser'), 'student@udd.edu.ph');
});

test('legacy SQL deadlines retain their UTC time and local test emails do not target a nonexistent Google account', () => {
  const link = new URL(taskCalendarLink({ title: 'Report', calendarDeadline: '2026-11-07 15:59:00' }, 'student@epanunot.test'));
  assert.equal(link.searchParams.get('dates'), '20261107T155900Z/20261107T162900Z');
  assert.equal(link.searchParams.has('authuser'), false);
});

test('precise timestamps determine the calendar time even across date boundaries', () => {
  const link = new URL(taskCalendarLink({ title: 'Report', date: '2026-11-30', calendarDeadline: '2026-12-01T01:00:00Z' }));
  assert.equal(link.searchParams.get('dates'), '20261201T010000Z/20261201T013000Z');
  assert.equal(taskCalendarLink({ title: 'Invalid date', date: '2026-02-31' }), null);
});

test('cached tasks can use their existing deadline and invalid dates produce no link', () => {
  assert.ok(taskCalendarLink({ title: 'Report', due: new Date('2026-11-07T15:59:00Z') }));
  assert.equal(taskCalendarLink({ title: 'Invalid', calendarDeadline: 'invalid' }), null);
});
