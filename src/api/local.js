// Calls to local DB API (server.js /api/db/*)

const BASE = 'http://localhost:3001/api/db';

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json;
}

export function getDbAccounts() {
  return get('/accounts');
}

export function getDbMetrics(accountId, { since, until }) {
  return get(`/metrics/${accountId}?since=${since}&until=${until}`);
}

export function getDbAggregate(accountId, { since, until }) {
  return get(`/aggregate/${accountId}?since=${since}&until=${until}`);
}

export async function triggerSync() {
  const res = await fetch(`${BASE}/sync`, { method: 'POST' });
  return res.json();
}
