// src/api/client.js
// One place that talks to the Laravel API. Every screen imports { api } from here.

const BASE = (import.meta.env?.VITE_API_URL ?? 'http://localhost:8000/api').replace(/\/$/, '');
const SERVER = BASE.replace(/\/api$/, '');
export const googleLoginUrl = `${SERVER}/auth/google/redirect`;

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
export async function api(path, { method = 'GET', body, query } = {}) {
  return request(BASE + path, { method, body, query });
}

export async function logout() {
  return request(`${SERVER}/logout`, { method: 'POST' });
}

export async function developmentAccounts() {
  return request(`${SERVER}/auth/development/accounts`);
}

export async function loginAsDevelopmentAccount(account) {
  return request(`${SERVER}/auth/development/login`, { method: 'POST', body: { account } });
}

async function request(address, { method = 'GET', body, query } = {}) {
  const url = new URL(address, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }

  let response;
  try {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
      const csrf = await fetch(`${SERVER}/sanctum/csrf-cookie`, {
        credentials: 'include', headers: { Accept: 'application/json' },
      });
      if (!csrf.ok) throw new ApiError('Could not initialize your session. Please reload and try again.', csrf.status);
    }
    const csrfCookie = document.cookie.split('; ').find((cookie) => cookie.startsWith('XSRF-TOKEN='));
    const csrfToken = csrfCookie ? decodeURIComponent(csrfCookie.slice('XSRF-TOKEN='.length)) : '';
    response = await fetch(url, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Cannot reach the server. Is the backend running?', 0);
  }

  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);

  if (response.status === 401) {
    window.dispatchEvent(new Event('auth:expired'));
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
