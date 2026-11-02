import { useApiQuery } from '../../api/useApiQuery.js';

export function useSubjectChoices(user) {
  const ledger = useApiQuery('/subject-enrollments/mine', { enabled: user.role !== 'admin' });
  const offered = useApiQuery('/subjects', { query: { block_id: user.block_id }, enabled: user.role === 'mayor' && Boolean(user.block_id) });
  const choices = (ledger.data?.data ?? []).map((entry) => ({
    value: `${entry.block_id}:${entry.subject_id}`, subjectId: entry.subject_id, blockId: entry.block_id,
    name: entry.name, code: entry.code, label: `${entry.code} — ${entry.name} · ${entry.block_code}`,
  }));
  if (user.role === 'mayor') {
    for (const subject of offered.data?.data ?? []) {
      if (!choices.some((choice) => choice.value === `${user.block_id}:${subject.id}`)) {
        choices.push({ value: `${user.block_id}:${subject.id}`, subjectId: subject.id, blockId: user.block_id,
          name: subject.name, code: subject.code, label: `${subject.code} — ${subject.name} · ${user.block}` });
      }
    }
  }
  return { choices, ledger, offered };
}
