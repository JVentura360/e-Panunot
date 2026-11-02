// "2026-11-05T15:59:00.000000Z" or "2026-11-05 23:59:00" -> "2026-11-05"
const dateKey = (value) => String(value).slice(0, 10);
const endOfDay = (key) => new Date(`${key}T23:59:00`);

export const toClassTask = (row) => {
const date = dateKey(row.due_date);
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
        due: endOfDay(date),
        done: Boolean(row.completed_at),
    };
};

export const toPersonalTask = (row) => {
    const date = dateKey(row.due_date ?? row.created_at);
    return {
        id: `p-${row.id}`,
        rawId: row.id,
        personal: true,
        title: row.title,
        platform: '',
        subject: '',
        by: '',
        date,
        due: endOfDay(date),
        done: Boolean(row.is_done),
    };
};