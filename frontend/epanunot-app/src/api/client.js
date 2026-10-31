// src/api/client.js
// One place that talks to the Laravel API. Every screen imports { api } from here.
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({ defaultOptions: { queries: {
  staleTime: 120000, gcTime: 600000, retry: false,
  refetchOnWindowFocus: false, refetchOnReconnect: true,
} } });
let cacheGeneration = 0;
export function clearApiCache() {
  cacheGeneration++;
  requestControllers.forEach((controller) => controller.abort());
  queryClient.clear();
}

const BASE = (import.meta.env?.VITE_API_URL ?? 'http://localhost:8000/api').replace(/\/$/, '');
const SERVER = BASE.replace(/\/api$/, '');
export const googleLoginUrl = `${SERVER}/auth/google/redirect`;
const requestControllers = new Set();
const requestListeners = new Set();
let pendingCount = 0;
export const getPendingRequestCount = () => pendingCount;
export const subscribeRequests = (listener) => {
  requestListeners.add(listener);
  return () => requestListeners.delete(listener);
};
const notifyRequests = () => requestListeners.forEach((listener) => listener());

export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors ?? null; // Laravel validation errors: { field: ['message'] }
  }
}

/**
 * api('/blocks')
 * api('/mayor-applications', { method: 'POST', body: { ... } })
 * api('/calendar', { query: { from: '...', to: '...' } })
 *
 * Returns the parsed JSON (or null for 204). Throws ApiError on any failure.
 * A 401 fires an "auth:expired" event so App can show Login.
 */
export function apiQueryOptions(path, { query } = {}) {
  const sensitive = ['/me', '/join-requests/mine', '/mayor-applications/mine'].includes(path);
  return {
    queryKey: ['api', cacheGeneration, path, query ?? {}],
    queryFn: () => request(BASE + path, { query }),
    staleTime: sensitive ? 60000 : path === '/subjects' || path === '/admin/terms/current' ? 600000 : 120000,
    refetchOnWindowFocus: sensitive,
  };
}

export async function api(path, { method = 'GET', body, query, force = false } = {}) {
  if (method.toUpperCase() === 'GET') {
    const options = apiQueryOptions(path, { query });
    if (force) await queryClient.invalidateQueries({ queryKey: options.queryKey, exact: true, refetchType: 'none' });
    return queryClient.fetchQuery(options);
  }
  const result = await request(BASE + path, { method, body, query });
  const affected = path.includes('terms') ? null
    : path.includes('mayor-applications') ? ['/mayor-applications', '/admin/mayor-applications', '/blocks', '/me']
    : path.includes('join-requests') || path.includes('/members') ? ['/blocks', '/join-requests', '/me']
    : path.includes('subjects') ? ['/subjects', '/blocks']
    : path.includes('calendar') || path.includes('personal-todos') ? ['/calendar', '/personal-todos']
    : ['/' + path.split('/')[1]];
  await queryClient.invalidateQueries({ predicate: (item) => item.queryKey[0] === 'api'
    && (affected === null || affected.some((prefix) => item.queryKey[2] === prefix || item.queryKey[2].startsWith(prefix + '/'))) });
  return result;
}

export async function logout() {
  const result = await request(`${SERVER}/logout`, { method: 'POST' });
  clearApiCache();
  return result;
}

export async function developmentAccounts() {
  return queryClient.fetchQuery({
    queryKey: ['development-accounts', cacheGeneration],
    queryFn: () => request(`${SERVER}/auth/development/accounts`),
    staleTime: 600000,
  });
}

export async function loginAsDevelopmentAccount(account) {
  const result = await request(`${SERVER}/auth/development/login`, { method: 'POST', body: { account } });
  clearApiCache();
  return result;
}

async function request(address, { method = 'GET', body, query } = {}) {
  const url = new URL(address, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }

  const controller = new AbortController();
  requestControllers.add(controller);
  pendingCount++;
  notifyRequests();
  const pending = send(url, { method, body, signal: controller.signal }).finally(() => {
    requestControllers.delete(controller);
    pendingCount--;
    notifyRequests();
  });
  return pending;
}

async function send(url, { method, body, signal: parentSignal }) {
  const generation = cacheGeneration;
  const timeout = AbortSignal.timeout(20000);
  const signal = parentSignal ? AbortSignal.any([parentSignal, timeout]) : timeout;

  let response;
  try {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
      const csrf = await fetch(`${SERVER}/sanctum/csrf-cookie`, {
        credentials: 'include', headers: { Accept: 'application/json' }, signal,
      });
      if (!csrf.ok) throw new ApiError('Could not initialize your session. Please reload and try again.', csrf.status);
    }
    const csrfCookie = document.cookie.split('; ').find((cookie) => cookie.startsWith('XSRF-TOKEN='));
    const csrfToken = csrfCookie ? decodeURIComponent(csrfCookie.slice('XSRF-TOKEN='.length)) : '';
    response = await fetch(url, {
      method,
      credentials: 'include',
      signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (signal.aborted) throw new ApiError('The server took too long to respond. Please try again.', 0);
    throw new ApiError('Cannot reach the server. Is the backend running?', 0);
  }

  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);

  if (response.status === 401) {
    setTimeout(() => {
      if (generation !== cacheGeneration) return;
      clearApiCache();
      window.dispatchEvent(new Event('auth:expired'));
    }, 0);
  }

  if (!response.ok) {
    throw new ApiError(data?.message ?? `Request failed (${response.status})`, response.status, data?.errors);
  }

  return data;
}

/** The message to show the user: the first validation error if there is one. */
export function errorMessage(error) {
  if (error instanceof ApiError && error.errors) {
    const first = Object.values(error.errors).flat()[0];
    if (first) return first;
  }
  return error?.message ?? 'Something went wrong.';
}
