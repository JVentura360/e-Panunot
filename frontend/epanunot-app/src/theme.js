export const THEME_KEY = 'epanunot-theme';

export function readTheme(storage) {
  try {
    return storage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function initializeTheme() {
  let theme = 'dark';
  try { theme = readTheme(window.localStorage); } catch { /* Storage may be unavailable. */ }
  document.documentElement.dataset.theme = theme;
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { window.localStorage.setItem(THEME_KEY, theme); } catch { /* Keep the selection for this session. */ }
}
