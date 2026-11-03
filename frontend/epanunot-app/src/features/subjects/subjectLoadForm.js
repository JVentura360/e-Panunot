export const scopeKey = (program, year) => `${String(program).trim().toUpperCase()}:${Number(year)}`;
export const proposalForScope = (draft, scope) => draft?.scope === scope ? draft.rows : [];
export const makeSubjectRows = (subjects = [], { allowEmpty = false } = {}) => (subjects.length || allowEmpty ? subjects : [{ code: '', name: '' }])
  .map((subject) => ({ key: crypto.randomUUID(), ...(subject.id ? { id: subject.id } : {}), code: subject.code, name: subject.name }));

export function subjectRowsError(rows, { allowEmpty = false } = {}) {
  if (!Array.isArray(rows) || !allowEmpty && !rows.length || rows.length > 60) return allowEmpty ? 'Add up to 60 subjects.' : 'Add between 1 and 60 subjects.';
  const codes = new Set();
  for (const row of rows) {
    const code = row.code?.trim().replace(/\s+/g, ' ').toUpperCase();
    if (!code || !row.name?.trim()) return 'Enter a subject code and complete name for every row.';
    if (code.length > 20 || row.name.trim().length > 255) return 'Subject codes allow 20 characters and names allow 255.';
    if (codes.has(code)) return `The code ${code} appears more than once.`;
    codes.add(code);
  }
  return '';
}

export function subjectPayload(rows, { includeIds = false, allowEmpty = false } = {}) {
  const error = subjectRowsError(rows, { allowEmpty });
  if (error) throw new Error(error);
  return rows.map((row) => ({ ...(includeIds && row.id ? { id: row.id } : {}), code: row.code.trim(), name: row.name.trim() }));
}
