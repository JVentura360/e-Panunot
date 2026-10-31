const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const toConcern = (row, viewerRole) => ({
    id: String(row.id),                       
    title: row.title,
    subject: row.subject?.name ?? 'Other',
    category: cap(row.category),
    description: row.description,
    status: row.status,
    studentId: row.student?.id,
    studentName: row.student?.name ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    unread: { [viewerRole]: row.is_unread },  
    attachments: row.attachments ?? [],       
    messages: [],
});

export const toMessage = (m, studentId) => ({
    id: String(m.id),
    role: m.type === 'system' ? 'system' : m.sender?.id === studentId ? 'student' : 'mayor',
    authorName: m.sender?.name ?? '',
    text: m.message_text,
    at: m.created_at,
});