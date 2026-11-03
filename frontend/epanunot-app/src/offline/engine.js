export const OFFLINE_PATHS = ['/me', '/tasks', '/personal-todos', '/notifications'];
const empty = () => ({ data: [] });

export function createOfflineEngine({ storage, uuid = () => crypto.randomUUID(), now = () => new Date().toISOString(), changed = () => {} }) {
  let current = null;
  let syncing = false;
  const publish = (next) => { current = next; changed(); return next; };
  const update = async (change) => {
    if (!current) throw new Error('Connect and sign in before saving offline changes.');
    const id = current.id;
    const next = await storage.update(id, change);
    if (current?.id === id) publish(next);
    return next;
  };
  const editable = () => {
    if (syncing) throw new Error('Your saved changes are syncing. Please try again in a moment.');
    if (!current) throw new Error('Connect and sign in before saving offline changes.');
  };
  const engine = {
    record: () => current,
    syncing: () => syncing,
    async restore() {
      const id = await storage.active();
      return publish(id ? await storage.load(id) : null);
    },
    async reload() {
      const previous = current;
      if (!previous) return;
      const saved = await storage.load(previous.id);
      if (current === previous) publish(saved);
    },
    async activate(user) {
      if (!['student', 'mayor'].includes(user.role)) return;
      const record = await storage.update(user.id, (old) => ({ ...old, closed: false, user }), true);
      await storage.setActive(String(user.id));
      return publish(record);
    },
    async deactivate({ purge = false } = {}) {
      const id = current?.id;
      if (purge && id) await storage.remove(id);
      publish(null);
      await storage.setActive(null);
    },
    async cache(path, data, expectedId = current?.id) {
      if (!OFFLINE_PATHS.includes(path) || !current || String(expectedId) !== current.id) return;
      return update((old) => ({ ...old, snapshots: { ...old.snapshots, [path]: data }, lastSavedAt: now() }));
    },
    view(path) {
      if (!current) return path === '/me' ? null : empty();
      if (path === '/me') return { data: current.user };
      const source = current.snapshots[path] ?? empty();
      if (!['/tasks', '/personal-todos'].includes(path)) return source;
      const rows = (source.data ?? []).map((row) => ({ ...row }));
      for (const operation of current.outbox) {
        if (path === '/personal-todos' && operation.kind === 'create_personal') {
          const existing = rows.find((row) => row.client_id === operation.client_id);
          if (existing) { existing.is_done = operation.done; existing._offline_pending = true; }
          else rows.unshift({ id: 'offline:'+operation.client_id, client_id: operation.client_id, title: operation.title,
            due_date: operation.due_date, is_done: operation.done, created_at: operation.created_at, revision: 0, _offline_pending: true });
        }
        const personal = operation.kind === 'complete_personal';
        if (operation.kind === 'complete_task' && path === '/tasks' || personal && path === '/personal-todos') {
          const row = rows.find((item) => String(item.id) === String(personal ? operation.todo_id : operation.task_id));
          if (row) {
            if (personal) row.is_done = operation.done;
            else row.completed_at = operation.done ? operation.created_at : null;
            row._offline_pending = true;
          }
        }
      }
      return { ...source, data: rows };
    },
    async createPersonal({ title, due_date }) {
      editable();
      if (!title?.trim()) throw new Error('Please add a title.');
      const clientId = uuid();
      return update((old) => ({ ...old, outbox: [...old.outbox, { operation_id: uuid(), kind: 'create_personal',
        client_id: clientId, title: title.trim(), due_date, done: false, created_at: now() }] }));
    },
    async complete(id, personal, done) {
      editable();
      const path = personal ? '/personal-todos' : '/tasks';
      const row = engine.view(path).data.find((item) => String(item.id) === String(id));
      if (!row) throw new Error('This task is not in your saved data. Reconnect to refresh it.');
      return update((old) => {
        const attempted = old.outbox.some((op) => op.attempted && (personal
          ? op.kind === 'create_personal' && op.client_id === row.client_id || op.kind === 'complete_personal' && String(op.todo_id) === String(id)
          : op.kind === 'complete_task' && String(op.task_id) === String(id)));
        if (attempted) throw new Error('Reconnect to finish syncing this task before changing it again.');
        const creation = personal && old.outbox.find((op) => op.kind === 'create_personal' && op.client_id === row.client_id);
        if (creation) return { ...old, outbox: old.outbox.map((op) => op === creation ? { ...op, operation_id: uuid(), done } : op) };
        const kind = personal ? 'complete_personal' : 'complete_task';
        const key = personal ? 'todo_id' : 'task_id';
        const outbox = old.outbox.filter((op) => !(op.kind === kind && String(op[key]) === String(id)));
        const base = old.snapshots[path]?.data?.find((item) => String(item.id) === String(id));
        if (!base) throw new Error('The task is no longer available. Reconnect to refresh your data.');
        const original = personal ? Boolean(base.is_done) : Boolean(base.completed_at);
        if (original !== done) outbox.push({ operation_id: uuid(), kind, [key]: id, done,
          expected_revision: personal ? base.revision ?? 0 : base.completion_revision ?? 0, created_at: now() });
        return { ...old, outbox };
      });
    },
    async clearNotice() { if (current) await update((old) => ({ ...old, notice: '' })); },
    async flush(transport) {
      if (syncing || !current?.outbox.length) return;
      const id = current.id;
      syncing = true;
      changed();
      try {
        const user = await transport.verify();
        if (String(user.id) !== id) throw Object.assign(new Error('Your account changed. Sign in again to sync your saved changes.'), { accountChanged: true });
        if (current?.id !== id) return;
        while (current?.id === id && current.outbox.length) {
          // An upload can commit even if its response is lost. Persist this before
          // sending so later edits cannot replace an operation that must replay.
          await update((old) => ({ ...old, outbox: old.outbox.map((op, index) => index < 100 ? { ...op, attempted: true } : op) }));
          if (current?.id !== id) return;
          const batch = current.outbox.slice(0, 100);
          const response = await transport.upload(id, batch);
          if (current?.id !== id) return;
          const results = response.results;
          if (!Array.isArray(results) || batch.some((op) => !results.some((result) => result.operation_id === op.operation_id && ['applied', 'conflict', 'rejected'].includes(result.status)))) {
            throw new Error('The sync response was incomplete. Your saved changes will be retried.');
          }
          const lists = await transport.lists();
          if (current?.id !== id) return;
          const acknowledged = new Set(results.map((result) => result.operation_id));
          const issues = results.filter((result) => result.status !== 'applied');
          await update((old) => ({ ...old, user, snapshots: { ...old.snapshots, '/tasks': lists.tasks, '/personal-todos': lists.personal },
            outbox: old.outbox.filter((op) => !acknowledged.has(op.operation_id)), lastSyncedAt: now(),
            notice: issues.length ? issues.map((result) => result.message || 'A task changed online; the server version was kept.').join(' ') : old.notice ?? '' }));
        }
      } finally { syncing = false; changed(); }
    },
  };
  return engine;
}
