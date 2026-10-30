// src/context/BlockContext.jsx
// Same shape the admin screens already use ({ apps, mayors, blocks, approve, reject }),
// but the data now comes from the Laravel API instead of mock data.
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api, errorMessage } from '../api/client.js';

const BlockContext = createContext(null);

// year + semester, then program, then number padded to 2 digits: (3, 1, 'ITE', 4) -> '31-ITE-04'
// eslint-disable-next-line react-refresh/only-export-components
export const blockCode = (year, semester, program, number) =>
  `${year}${semester}-${String(program).toUpperCase()}-${String(number).padStart(2, '0')}`;

// API row (admin list or "my applications") -> what MayorApplications.jsx / Profile.jsx expect
// eslint-disable-next-line react-refresh/only-export-components
export const toApplication = (row) => ({
  id: row.id,
  name: row.applicant_name ?? '',
  email: row.applicant_email ?? '',
  block: blockCode(row.year_level, row.semester, row.program, row.block_number),
  motivation: row.motivation ?? '',
  status: row.status,
});

const toBlock = (row) => ({
  id: row.id,
  name: blockCode(row.year_level, row.semester, row.program, row.block_number),
  mayor: row.mayor_name ?? '-',
  mayorId: row.mayor_id,
  mayorEmail: row.mayor_email ?? '',
  members: Number(row.member_count ?? 0),
});

export function BlockProvider({ children }) {
  const [apps, setApps] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // The admin dashboard calls this when it opens (and approve/reject call it again).
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [applications, blockList] = await Promise.all([
        api('/admin/mayor-applications', { query: { per_page: 100 } }),
        api('/blocks', { query: { per_page: 100 } }),
      ]);
      setApps(applications.data.map(toApplication));
      setBlocks(blockList.data.map(toBlock));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Every mayor is the mayor of one block, so the mayors list comes from the blocks.
  const mayors = useMemo(
    () =>
      blocks
        .filter((b) => b.mayorId)
        .map((b) => ({ id: b.mayorId, name: b.mayor, email: b.mayorEmail, block: b.name })),
    [blocks]
  );

  // Returns { ok: true } or { ok: false, message } like before, but it is async now.
  const approve = useCallback(
    async (app) => {
      try {
        await api(`/admin/mayor-applications/${app.id}/approve`, { method: 'POST' });
        await load();
        return { ok: true };
      } catch (e) {
        return { ok: false, message: errorMessage(e) };
      }
    },
    [load]
  );

  const reject = useCallback(
    async (id) => {
      try {
        await api(`/admin/mayor-applications/${id}/reject`, { method: 'POST', body: {} });
        await load();
      } catch (e) {
        setError(errorMessage(e));
      }
    },
    [load]
  );

  return (
    <BlockContext.Provider value={{ apps, mayors, blocks, loading, error, load, approve, reject }}>
      {children}
    </BlockContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBlocks() {
  const ctx = useContext(BlockContext);
  if (!ctx) throw new Error('useBlocks must be used inside <BlockProvider>');
  return ctx;
}
