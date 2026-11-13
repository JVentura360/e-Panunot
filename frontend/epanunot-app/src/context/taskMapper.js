// Keep exact UTC deadlines while deriving display dates and times in the device timezone.
import { deadlineDate, deadlineInput } from '../components/deadline.js';
const dateKey = (value) => String(value).slice(0, 10);
const endOfDay = (key) => new Date(`${key}T23:59:00`);

export const toClassTask = (row) => {
    const localDeadline = deadlineInput(row.due_date);
    const date = localDeadline.slice(0, 10);
    return {
        id: `t-${row.id}`,
        rawId: row.id,
        personal: false,
        title: row.title,
        platform: row.platform ?? '',
        subject: row.subject ? `${row.subject.code} — ${row.subject.name}` : '',
        subjectId: row.subject_id,
        by: row.created_by?.name ?? 'your mayor',
        date,
        time: localDeadline.slice(11),
        due: deadlineDate(row.due_date),
        calendarDeadline: row.due_date,
        done: Boolean(row.completed_at),
        pendingSync: Boolean(row._offline_pending),
    };
};

export const toPersonalTask = (row) => {
    const date = row.due_at ? deadlineInput(row.due_at).slice(0, 10) : dateKey(row.due_date ?? row.created_at);
    return {
        id: `p-${row.id}`,
        rawId: row.id,
        personal: true,
        title: row.title,
        platform: '',
        subject: '',
        by: '',
        date,
        time: row.due_at ? deadlineInput(row.due_at).slice(11) : '23:59',
        due: row.due_at ? deadlineDate(row.due_at) : endOfDay(date),
        calendarDeadline: row.due_at ?? null,
        done: Boolean(row.is_done),
        pendingSync: Boolean(row._offline_pending),
    };
};
