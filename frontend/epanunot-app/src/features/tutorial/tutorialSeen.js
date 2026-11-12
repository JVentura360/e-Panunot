const PREFIX = 'epanunot-tutorial';

// Admins get no tutorial. Students and mayors each get their own, once.
export const tutorialRole = (user) =>
  user && user.id != null && ['student', 'mayor'].includes(user.role) ? user.role : null;

export function tutorialKey(user) {
  const role = tutorialRole(user);
  return role ? `${PREFIX}:${user.id}:${role}` : null;
}

// If storage is unavailable (private mode, blocked), we choose not to show it,
// so people aren't nagged on every page load.
export function shouldShowTutorial(storage, user) {
  const key = tutorialKey(user);
  if (!key) return false;
  try { return storage.getItem(key) !== '1'; } catch { return false; }
}

export function markTutorialSeen(storage, user) {
  const key = tutorialKey(user);
  if (!key) return;
  try { storage.setItem(key, '1'); } catch { /* Storage may be unavailable. */ }
}