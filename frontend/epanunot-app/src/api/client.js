// src/api/client.js
// One place that talks to the Laravel API. Every screen imports { api } from here.

const BASE = (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api').replace(/\/$/, '');
const TOKEN_KEY = 'epanunot_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const setToken = (token) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};

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
 * A 401 clears the saved token and fires an "auth:expired" event so App can show Login.
 */
export async function api(path, { method = 'GET', body, query } = {}) {
  const url = new URL(BASE + path, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
  }

  const token = getToken();
  let response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Cannot reach the server. Is the backend running?', 0);
  }

  if (response.status === 204) return null;

  const data = await response.json().catch(() => null);

  if (response.status === 401) {
    setToken(null);
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
