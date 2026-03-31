const BASE = import.meta.env.VITE_API_URL ?? '';

function authHeaders() {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json;
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json;
}

async function put(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json;
}

async function del(path) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `HTTP ${res.status}`);
  return json;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export function login(email, password) {
  return post('/api/auth/login', { email, password });
}

export function getMe() {
  return get('/api/auth/me');
}

// ── DB ────────────────────────────────────────────────────────────────────────

export function getDbAccounts() {
  return get('/api/db/accounts');
}

export function getDbMetrics(accountId, { since, until }) {
  return get(`/api/db/metrics/${accountId}?since=${since}&until=${until}`);
}

export function getDbAggregate(accountId, { since, until }) {
  return get(`/api/db/aggregate/${accountId}?since=${since}&until=${until}`);
}

export function triggerSync() {
  return post('/api/db/sync', {});
}

// ── Clients ──────────────────────────────────────────────────────────────────

export function getClients() {
  return get('/api/clients');
}

export function createClient(data) {
  return post('/api/clients', data);
}

export function updateClient(id, data) {
  return put(`/api/clients/${id}`, data);
}

export function deleteClient(id) {
  return del(`/api/clients/${id}`);
}

// ── Platform connections ──────────────────────────────────────────────────────

export function getConnections() {
  return get('/api/auth/connections');
}

export function getGoogleAdsOAuthUrl() {
  return get('/api/auth/google-ads/url');
}

export function disconnectGoogleAds() {
  return del('/api/auth/google-ads');
}

// ── Google Ads ────────────────────────────────────────────────────────────────

export function getGadsAccounts() {
  return get('/api/gads/accounts');
}

export function getGadsMetrics(accountId, { since, until }) {
  return get(`/api/gads/metrics/${accountId}?since=${since}&until=${until}`);
}

export function getGadsAggregate(accountId, { since, until }) {
  return get(`/api/gads/aggregate/${accountId}?since=${since}&until=${until}`);
}

export function triggerGadsSync() {
  return post('/api/gads/sync', {});
}

// ── Users ─────────────────────────────────────────────────────────────────────

export function getUsers() {
  return get('/api/users');
}

export function createUser(data) {
  return post('/api/users', data);
}

export function updateUser(id, data) {
  return put(`/api/users/${id}`, data);
}

export function deleteUser(id) {
  return del(`/api/users/${id}`);
}
