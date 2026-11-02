export function visibleClassTasks(store, user, enrollments) {
  const primary = user.block_id ?? user.block;
  const blocks = [...new Set([primary, ...enrollments.map((entry) => entry.block_id)].filter(Boolean).map(String))];
  return blocks.flatMap((block) => {
    const subjects = enrollments.filter((entry) => String(entry.block_id) === block);
    return (store[`block:${block}`] ?? []).filter((task) => {
      if (primary != null && String(primary) === block && (!user.student_type || user.role === 'mayor')) return true;
      if (task.subjectId) return subjects.some((entry) => String(entry.subject_id) === String(task.subjectId));
      if (!task.subject || ['Other', 'All block subjects'].includes(task.subject)) return subjects.length > 0;
      return subjects.some((entry) => entry.name === task.subject || `${entry.code} — ${entry.name}` === task.subject);
    }).map((task) => ({ ...task, assignedBlockId: block }));
  });
}
