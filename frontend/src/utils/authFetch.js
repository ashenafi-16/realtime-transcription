/**
 * Authenticated fetch wrapper — automatically includes JWT Bearer token.
 * Drop-in replacement for `fetch()` in all API calls.
 */
const API_BASE = 'http://localhost:8000';

export function authFetch(url, options = {}) {
  const token = localStorage.getItem('voicescribe-token');
  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (file uploads)
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(url, { ...options, headers });
}

/**
 * Get the current JWT token for WebSocket connections.
 */
export function getToken() {
  return localStorage.getItem('voicescribe-token') || '';
}
