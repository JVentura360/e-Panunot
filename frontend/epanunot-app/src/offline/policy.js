export function canOpenOffline(destination, role) {
  if (!['student', 'mayor'].includes(role)) return false;
  if (typeof destination !== 'string' || !destination.startsWith('/') || destination.startsWith('//')) return false;
  const path = destination.split(/[?#]/)[0];
  return path === '/' || path === '/calendar' || path === '/notifications' || path === '/settings';
}
