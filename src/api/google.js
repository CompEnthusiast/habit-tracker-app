// When in local development, default to localhost:5000 unless specified
const rawUrl = import.meta.env.VITE_API_URL;
const isLocalhost = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const API_BASE = (import.meta.env.DEV && isLocalhost)
  ? 'http://localhost:5000'
  : (rawUrl ? rawUrl.replace(/\/+$/, '') : 'http://localhost:5000');

const BASE = `${API_BASE}/api/google`;

function getToken() {
  const info = localStorage.getItem('userInfo');
  return info ? JSON.parse(info).token : null;
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };
}

export async function getGoogleAuthUrl() {
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = `${BASE}/auth-url?client_redirect=${encodeURIComponent(currentOrigin)}`;
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Server returned ${res.status}: Failed to get Google Auth URL`);
  }
  return res.json();
}

export async function getGoogleStatus() {
  const res = await fetch(`${BASE}/status`, { headers: authHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Server returned ${res.status}`);
  }
  return res.json();
}

export async function disconnectGoogle() {
  const res = await fetch(`${BASE}/disconnect`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to disconnect Google');
  }
  return res.json();
}

export async function syncGoogleHabits(dateKey) {
  const timezoneOffset = new Date().getTimezoneOffset();
  const res = await fetch(`${BASE}/sync`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      dateKey,
      timezoneOffset,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to sync with Google');
  }
  return res.json();
}

export async function pushHabitsToGoogleTasks(dateKey) {
  const timezoneOffset = new Date().getTimezoneOffset();
  const res = await fetch(`${BASE}/push-tasks`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      dateKey,
      timezoneOffset,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to push habits to Google Tasks');
  }
  return res.json();
}
