export function tunnelHostname(value = '') {
  if (!value.trim()) return null;
  const url = new URL(value.includes('://') ? value : `https://${value}`);
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.devtunnels.ms') || url.username || url.password || url.port) {
    throw new Error('Use the HTTPS Dev Tunnel address ending in .devtunnels.ms, without a port.');
  }
  return url.hostname;
}

export function phoneProxy(target = 'http://127.0.0.1:8000') {
  return Object.fromEntries(['^/api(?:/|$)', '^/auth(?:/|$)', '^/sanctum(?:/|$)', '^/logout$'].map(path => [path, {
    target, changeOrigin: true, cookieDomainRewrite: '',
  }]));
}
