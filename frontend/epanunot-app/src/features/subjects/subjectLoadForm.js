export const scopeKey = (program, year) => `${String(program).trim().toUpperCase()}:${Number(year)}`;
export const proposalForScope = (draft, scope) => draft?.scope === scope ? draft.rows : [];
export const makeSubjectRows = (subjects = []) => (subjects.length ? subjects : [{ code: '', name: '' }])
  .map((subject) => ({ key: crypto.randomUUID(), code: subject.code, name: subject.name }));

export function subjectRowsError(rows) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 60) return 'Add between 1 and 60 subjects.';
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

export function subjectPayload(rows) {
  const error = subjectRowsError(rows);
  if (error) throw new Error(error);
  return rows.map((row) => ({ code: row.code.trim(), name: row.name.trim() }));
}
