export const TASK_STORAGE_KEY = 'epanunot-tasks-v2';

const oldPresetTitles = new Map([
  [1, 'Submit Capstone Proposal'],
  [2, 'Pay class shirt contribution'],
  [3, 'Lab Report 2: Data Structures'],
  ['p1', 'Buy a blue book'],
  ['p2', 'Print readings for ENG 12'],
]);

export function readTasks(storage) {
  try {
    const data = JSON.parse(storage.getItem(TASK_STORAGE_KEY));
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('completed:')) {
        if (!value || typeof value !== 'object' || Array.isArray(value) || Object.values(value).some((done) => typeof done !== 'boolean')) return {};
      } else if (!Array.isArray(value) || value.some((task) => !task || typeof task.title !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(task.date))) return {};
      else data[key] = value.filter((task) => oldPresetTitles.get(task.id) !== task.title);
    }
    return data;
  } catch { return {}; }
}

export function saveTasks(storage, data) {
  try { storage.setItem(TASK_STORAGE_KEY, JSON.stringify(data)); } catch { /* In-memory state remains available. */ }
  return data;
}
