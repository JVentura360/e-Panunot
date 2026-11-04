export const blockLabel = (block) => block?.code ?? '';

export const shortDate = (iso) =>
  new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });

// Tracks which announcements a user has already seen, so only new ones pop up on login.
const seenKey = (userId) => `seenAnnouncements:${userId}`;

export const readSeen = (userId) => {
  try {
    return new Set(JSON.parse(localStorage.getItem(seenKey(userId)) || '[]'));
  } catch {
    return new Set();
  }
};

export const writeSeen = (userId, ids) => {
  try {
    localStorage.setItem(seenKey(userId), JSON.stringify([...ids]));
  } catch { /* storage unavailable; falls back to in-memory state for this session */ }
};
