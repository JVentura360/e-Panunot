export function createSubjectTasks(values, offeredSubjects, makeId = () => crypto.randomUUID()) {
  const base = { ...values, title: values.title.trim(), personal: Boolean(values.personal), done: false };
  delete base.allSubjects;
  if (values.personal) return [{ ...base, id: makeId() }];
  if (!offeredSubjects.length) throw new Error('The admin must assign subjects to your block before you can assign tasks.');
  const selected = values.allSubjects ? offeredSubjects : offeredSubjects.filter((subject) => String(subject.id) === String(values.subjectId));
  if (!selected.length) throw new Error('Choose a subject offered in your block.');
  return selected.map((subject) => ({ ...base, id: makeId(), subjectId: subject.id, subject: `${subject.code} — ${subject.name}` }));
}
