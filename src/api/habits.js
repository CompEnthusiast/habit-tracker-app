const BASE = `${import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname ? `http://${window.location.hostname}:5000` : 'http://localhost:5000')}/api`;

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

export async function fetchHabits() {
  const res = await fetch(`${BASE}/habits`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch habits');
  return res.json();
}

export async function createHabit(data) {
  const res = await fetch(`${BASE}/habits`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create habit');
  return res.json();
}

export async function updateHabit(id, data) {
  const res = await fetch(`${BASE}/habits/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update habit');
  return res.json();
}

export async function deleteHabitApi(id) {
  const res = await fetch(`${BASE}/habits/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete habit');
  return res.json();
}

export async function toggleHabitDay(id, key) {
  const res = await fetch(`${BASE}/habits/${id}/toggle`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ key }),
  });
  if (!res.ok) throw new Error('Failed to toggle habit');
  return res.json();
}
