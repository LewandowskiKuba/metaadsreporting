import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import cron from 'node-cron';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import db from './db/database.js';
import { syncAll, syncYesterday } from './db/sync.js';
import {
  authMiddleware, adminOnly, checkAccountAccess,
  signToken, checkPassword, hashPassword, seedAdmin,
} from './db/auth.js';

const app = express();
const PORT = process.env.PORT || 3002;
const META_BASE = 'https://graph.facebook.com/v21.0';
const TOKEN = process.env.META_ACCESS_TOKEN;

if (!TOKEN || TOKEN === 'wklej_token_tutaj') {
  console.error('⚠️  Brak META_ACCESS_TOKEN w .env');
  process.exit(1);
}

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3002'] }));
app.use(express.json());

// ── Auth ──────────────────────────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email i hasło są wymagane' });

  const user = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1').get(email.toLowerCase().trim());
  if (!user || !checkPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Nieprawidłowy email lub hasło' });
  }

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// ── User management (admin only) ──────────────────────────────────────────────

app.get('/api/users', authMiddleware, adminOnly, (req, res) => {
  const users = db.prepare(
    'SELECT id, email, name, role, active, created_at FROM users ORDER BY created_at'
  ).all();

  // Attach account list per user
  const withAccounts = users.map(u => {
    const accounts = db.prepare(
      'SELECT account_id FROM user_accounts WHERE user_id = ?'
    ).all(u.id).map(r => r.account_id);
    return { ...u, accounts };
  });

  res.json({ data: withAccounts });
});

app.post('/api/users', authMiddleware, adminOnly, (req, res) => {
  const { email, name, password, role = 'viewer', accounts = [] } = req.body || {};
  if (!email || !name || !password) return res.status(400).json({ error: 'Brakujące pola' });
  if (!['admin', 'viewer'].includes(role)) return res.status(400).json({ error: 'Nieprawidłowa rola' });

  try {
    const info = db.prepare(
      'INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run(email.toLowerCase().trim(), name, hashPassword(password), role);

    const userId = info.lastInsertRowid;
    syncUserAccounts(userId, accounts);

    res.status(201).json({ ok: true, id: userId });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Email już istnieje' });
    throw err;
  }
});

app.put('/api/users/:id', authMiddleware, adminOnly, (req, res) => {
  const userId = Number(req.params.id);
  const { name, email, password, role, active, accounts } = req.body || {};

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Prevent removing the last admin
  if (role === 'viewer' && user.role === 'admin') {
    const adminCount = db.prepare("SELECT COUNT(*) as n FROM users WHERE role = 'admin' AND active = 1").get().n;
    if (adminCount <= 1) return res.status(400).json({ error: 'Nie można zdegradować ostatniego admina' });
  }

  db.prepare(`
    UPDATE users SET
      name          = COALESCE(?, name),
      email         = COALESCE(?, email),
      password_hash = COALESCE(?, password_hash),
      role          = COALESCE(?, role),
      active        = COALESCE(?, active)
    WHERE id = ?
  `).run(
    name || null,
    email ? email.toLowerCase().trim() : null,
    password ? hashPassword(password) : null,
    role || null,
    active != null ? (active ? 1 : 0) : null,
    userId
  );

  if (accounts !== undefined) syncUserAccounts(userId, accounts);

  res.json({ ok: true });
});

app.delete('/api/users/:id', authMiddleware, adminOnly, (req, res) => {
  const userId = Number(req.params.id);
  if (userId === req.user.userId) return res.status(400).json({ error: 'Nie możesz usunąć własnego konta' });

  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  res.json({ ok: true });
});

function syncUserAccounts(userId, accountIds) {
  db.prepare('DELETE FROM user_accounts WHERE user_id = ?').run(userId);
  const ins = db.prepare('INSERT OR IGNORE INTO user_accounts (user_id, account_id) VALUES (?, ?)');
  const batch = db.transaction(ids => ids.forEach(aid => ins.run(userId, aid)));
  batch(accountIds);
}

// ── Meta API proxy (protected) ────────────────────────────────────────────────

app.all('/api/meta/*', authMiddleware, async (req, res) => {
  const metaPath = req.path.replace('/api/meta', '');
  try {
    const response = await axios({
      method: req.method,
      url: `${META_BASE}${metaPath}`,
      params: { ...req.query, access_token: TOKEN },
      timeout: 30000,
    });
    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json(err.response?.data || { error: { message: err.message } });
  }
});

// ── DB: accounts (filtered by role) ──────────────────────────────────────────

app.get('/api/db/accounts', authMiddleware, (req, res) => {
  let accounts;
  if (req.user.role === 'admin') {
    accounts = db.prepare('SELECT * FROM accounts WHERE status = 1 ORDER BY name').all();
  } else {
    accounts = db.prepare(`
      SELECT a.* FROM accounts a
      JOIN user_accounts ua ON ua.account_id = a.id
      WHERE ua.user_id = ? AND a.status = 1
      ORDER BY a.name
    `).all(req.user.userId);
  }
  res.json({ data: accounts });
});

// ── DB: daily metrics ─────────────────────────────────────────────────────────

app.get('/api/db/metrics/:accountId', authMiddleware, checkAccountAccess, (req, res) => {
  const { accountId } = req.params;
  const { since, until } = req.query;
  if (!since || !until) return res.status(400).json({ error: 'since and until required' });

  const rows = db.prepare(`
    SELECT * FROM daily_metrics
    WHERE account_id = ? AND date >= ? AND date <= ?
    ORDER BY date ASC
  `).all(accountId, since, until);

  res.json({ data: rows });
});

// ── DB: aggregate KPIs ────────────────────────────────────────────────────────

app.get('/api/db/aggregate/:accountId', authMiddleware, checkAccountAccess, (req, res) => {
  const { accountId } = req.params;
  const { since, until } = req.query;
  if (!since || !until) return res.status(400).json({ error: 'since and until required' });

  const row = db.prepare(`
    SELECT
      SUM(spend)           AS spend,
      SUM(impressions)     AS impressions,
      SUM(reach)           AS reach,
      SUM(clicks)          AS clicks,
      SUM(unique_clicks)   AS unique_clicks,
      SUM(outbound_clicks) AS outbound_clicks,
      SUM(leads)           AS leads,
      SUM(calls)           AS calls,
      SUM(purchase_value)  AS purchase_value
    FROM daily_metrics
    WHERE account_id = ? AND date >= ? AND date <= ?
  `).get(accountId, since, until);

  const spend       = row?.spend || 0;
  const impressions = row?.impressions || 0;
  const clicks      = row?.unique_clicks || row?.clicks || 0;
  const leads       = row?.leads || 0;
  const calls       = row?.calls || 0;

  res.json({
    data: {
      ...row,
      cpm:           impressions > 0 ? (spend / impressions) * 1000 : 0,
      cpc:           clicks > 0 ? spend / clicks : 0,
      ctr:           impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpl:           leads > 0 ? spend / leads : null,
      cvr:           clicks > 0 && leads > 0 ? (leads / clicks) * 100 : null,
      cost_per_call: calls > 0 ? spend / calls : null,
      roas:          row?.purchase_value > 0 && spend > 0 ? row.purchase_value / spend : null,
    },
  });
});

// ── DB: manual sync ───────────────────────────────────────────────────────────

app.post('/api/db/sync', authMiddleware, adminOnly, async (req, res) => {
  try {
    await syncAll();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Static frontend (production) ──────────────────────────────────────────────

const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// ── Cron ──────────────────────────────────────────────────────────────────────

cron.schedule('0 3 * * *', async () => {
  console.log('[cron] Daily sync…');
  try { await syncYesterday(); } catch (err) { console.error('[cron]', err.message); }
}, { timezone: 'Europe/Warsaw' });

// ── Startup ───────────────────────────────────────────────────────────────────

app.listen(PORT, async () => {
  console.log(`Proxy → http://localhost:${PORT}`);

  seedAdmin();

  const needsBackfill = db.prepare(
    'SELECT COUNT(*) as n FROM accounts WHERE synced_at IS NULL'
  ).get().n;
  const totalAccounts = db.prepare('SELECT COUNT(*) as n FROM accounts').get().n;

  if (totalAccounts === 0 || needsBackfill > 0) {
    console.log('[startup] Backfilling…');
    syncAll().catch(err => console.error('[startup]', err.message));
  }
});
