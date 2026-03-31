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
  syncAllGoogle, syncGoogleYesterday, isGoogleAdsConfigured,
} from './db/sync-google.js';
import {
  authMiddleware, adminOnly, checkAccountAccess, checkGoogleAccountAccess,
  signToken, verifyToken, checkPassword, hashPassword, seedAdmin,
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

// ── Clients ───────────────────────────────────────────────────────────────────

function clientWithAccounts(id) {
  const client   = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  if (!client) return null;
  const accounts = db.prepare('SELECT platform, account_id FROM client_accounts WHERE client_id = ?').all(id);
  return { ...client, accounts };
}

app.get('/api/clients', authMiddleware, adminOnly, (req, res) => {
  const clients = db.prepare('SELECT * FROM clients ORDER BY name').all();
  const data    = clients.map(c => clientWithAccounts(c.id));
  res.json({ data });
});

app.post('/api/clients', authMiddleware, adminOnly, (req, res) => {
  const { name, accounts = [] } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ error: 'Nazwa klienta jest wymagana' });

  const info = db.prepare('INSERT INTO clients (name) VALUES (?)').run(name.trim());
  const id   = info.lastInsertRowid;

  const ins = db.prepare('INSERT OR IGNORE INTO client_accounts (client_id, platform, account_id) VALUES (?, ?, ?)');
  db.transaction(accs => accs.forEach(a => ins.run(id, a.platform, a.account_id)))(accounts);

  res.status(201).json({ ok: true, data: clientWithAccounts(id) });
});

app.put('/api/clients/:id', authMiddleware, adminOnly, (req, res) => {
  const id = Number(req.params.id);
  const { name, accounts } = req.body || {};

  if (!db.prepare('SELECT 1 FROM clients WHERE id = ?').get(id)) {
    return res.status(404).json({ error: 'Klient nie istnieje' });
  }

  if (name?.trim()) db.prepare('UPDATE clients SET name = ? WHERE id = ?').run(name.trim(), id);

  if (accounts !== undefined) {
    db.prepare('DELETE FROM client_accounts WHERE client_id = ?').run(id);
    const ins = db.prepare('INSERT OR IGNORE INTO client_accounts (client_id, platform, account_id) VALUES (?, ?, ?)');
    db.transaction(accs => accs.forEach(a => ins.run(id, a.platform, a.account_id)))(accounts);
  }

  res.json({ ok: true, data: clientWithAccounts(id) });
});

app.delete('/api/clients/:id', authMiddleware, adminOnly, (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM clients WHERE id = ?').run(id);
  res.json({ ok: true });
});

// ── Google Ads: accounts ──────────────────────────────────────────────────────

app.get('/api/gads/accounts', authMiddleware, (req, res) => {
  let accounts;
  if (req.user.role === 'admin') {
    accounts = db.prepare('SELECT * FROM google_accounts WHERE status = 1 ORDER BY name').all();
  } else {
    accounts = db.prepare(`
      SELECT ga.* FROM google_accounts ga
      JOIN user_google_accounts uga ON uga.account_id = ga.id
      WHERE uga.user_id = ? AND ga.status = 1
      ORDER BY ga.name
    `).all(req.user.userId);
  }
  res.json({ data: accounts, configured: isGoogleAdsConfigured() });
});

// ── Google Ads: daily metrics ─────────────────────────────────────────────────

app.get('/api/gads/metrics/:accountId', authMiddleware, checkGoogleAccountAccess, (req, res) => {
  const { accountId } = req.params;
  const { since, until } = req.query;
  if (!since || !until) return res.status(400).json({ error: 'since and until required' });

  const rows = db.prepare(`
    SELECT * FROM google_daily_metrics
    WHERE account_id = ? AND date >= ? AND date <= ?
    ORDER BY date ASC
  `).all(accountId, since, until);

  res.json({ data: rows });
});

// ── Google Ads: aggregate KPIs ────────────────────────────────────────────────

app.get('/api/gads/aggregate/:accountId', authMiddleware, checkGoogleAccountAccess, (req, res) => {
  const { accountId } = req.params;
  const { since, until } = req.query;
  if (!since || !until) return res.status(400).json({ error: 'since and until required' });

  const row = db.prepare(`
    SELECT
      SUM(spend)             AS spend,
      SUM(impressions)       AS impressions,
      SUM(clicks)            AS clicks,
      SUM(conversions)       AS conversions,
      SUM(video_views)       AS video_views,
      SUM(video_impressions) AS video_impressions,
      SUM(video_p25  * video_impressions) AS video_p25_abs,
      SUM(video_p50  * video_impressions) AS video_p50_abs,
      SUM(video_p75  * video_impressions) AS video_p75_abs,
      SUM(video_p100 * video_impressions) AS video_p100_abs
    FROM google_daily_metrics
    WHERE account_id = ? AND date >= ? AND date <= ?
  `).get(accountId, since, until);

  const spend       = row?.spend       || 0;
  const impressions = row?.impressions || 0;
  const clicks      = row?.clicks      || 0;
  const conversions = row?.conversions || 0;
  const vi          = row?.video_impressions || 0;

  res.json({
    data: {
      spend,
      impressions,
      clicks,
      conversions,
      video_views:       row?.video_views || 0,
      ctr:               impressions > 0 ? (clicks / impressions) * 100 : 0,
      cpc:               clicks > 0      ? spend / clicks              : 0,
      cost_per_conversion: conversions > 0 ? spend / conversions        : null,
      video_p25:         vi > 0 ? (row.video_p25_abs  / vi) : 0,
      video_p50:         vi > 0 ? (row.video_p50_abs  / vi) : 0,
      video_p75:         vi > 0 ? (row.video_p75_abs  / vi) : 0,
      video_p100:        vi > 0 ? (row.video_p100_abs / vi) : 0,
    },
  });
});

// ── Google Ads: manual sync ───────────────────────────────────────────────────

app.post('/api/gads/sync', authMiddleware, adminOnly, async (req, res) => {
  if (!isGoogleAdsConfigured()) {
    return res.status(400).json({ error: 'Google Ads nie jest skonfigurowany (.env)' });
  }
  try {
    await syncAllGoogle();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Google Ads OAuth ──────────────────────────────────────────────────────────

const GADS_OAUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const GADS_TOKEN_URL  = 'https://oauth2.googleapis.com/token';

function gadsCallbackUrl() {
  return `${process.env.APP_URL || 'http://localhost:3002'}/api/auth/google-ads/callback`;
}

// Returns the OAuth URL the frontend should navigate to
app.get('/api/auth/google-ads/url', authMiddleware, adminOnly, (req, res) => {
  if (!process.env.GOOGLE_ADS_CLIENT_ID) {
    return res.status(400).json({ error: 'Brak GOOGLE_ADS_CLIENT_ID w .env' });
  }

  const state = signToken({ userId: req.user.userId, purpose: 'gads_oauth' });

  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_ADS_CLIENT_ID,
    redirect_uri:  gadsCallbackUrl(),
    scope:         'https://www.googleapis.com/auth/adwords',
    response_type: 'code',
    access_type:   'offline',
    prompt:        'consent',
    state,
  });

  res.json({ url: `${GADS_OAUTH_BASE}?${params}` });
});

// OAuth callback — called by Google (no auth header)
app.get('/api/auth/google-ads/callback', async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const { code, state, error } = req.query;

  if (error) {
    console.error('[oauth] Google Ads denied:', error);
    return res.redirect(`${frontendUrl}/settings?error=google_ads`);
  }

  try {
    const payload = verifyToken(state);
    if (payload.purpose !== 'gads_oauth') throw new Error('Invalid state');
    const userId = payload.userId;

    // Exchange code for tokens
    const tokenRes = await axios.post(GADS_TOKEN_URL, {
      code,
      client_id:     process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      redirect_uri:  gadsCallbackUrl(),
      grant_type:    'authorization_code',
    });

    const { refresh_token, access_token } = tokenRes.data;
    if (!refresh_token) throw new Error('Brak refresh_token — upewnij się że Google prompt=consent jest ustawione');

    const config = {
      refresh_token,
      access_token,
      connected_at: new Date().toISOString(),
    };

    db.prepare(`
      INSERT INTO platform_connections (user_id, platform, config)
      VALUES (?, 'google_ads', ?)
      ON CONFLICT(user_id, platform) DO UPDATE SET
        config       = excluded.config,
        connected_at = CURRENT_TIMESTAMP
    `).run(userId, JSON.stringify(config));

    console.log(`[oauth] Google Ads połączono dla user ${userId}`);

    // Trigger discovery of accounts
    syncAllGoogle().catch(err => console.error('[oauth] Sync po połączeniu:', err.message));

    res.redirect(`${frontendUrl}/settings?connected=google_ads`);
  } catch (err) {
    console.error('[oauth] Google Ads callback error:', err.message);
    res.redirect(`${frontendUrl}/settings?error=google_ads&msg=${encodeURIComponent(err.message)}`);
  }
});

// Disconnect Google Ads
app.delete('/api/auth/google-ads', authMiddleware, adminOnly, (req, res) => {
  db.prepare(
    "DELETE FROM platform_connections WHERE user_id = ? AND platform = 'google_ads'"
  ).run(req.user.userId);
  res.json({ ok: true });
});

// Connection status for all platforms
app.get('/api/auth/connections', authMiddleware, (req, res) => {
  const rows = db.prepare(
    'SELECT platform, connected_at, user_id FROM platform_connections'
  ).all();

  const byPlatform = {};
  for (const row of rows) {
    const user = db.prepare('SELECT name, email FROM users WHERE id = ?').get(row.user_id);
    byPlatform[row.platform] = {
      connected:    true,
      connected_at: row.connected_at,
      by_user:      user ? `${user.name} (${user.email})` : null,
    };
  }

  res.json({
    meta:       byPlatform.meta       || { connected: false },
    google_ads: byPlatform.google_ads || { connected: false },
    google_ads_app_configured: !!(
      process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
      process.env.GOOGLE_ADS_CLIENT_ID &&
      process.env.GOOGLE_ADS_CLIENT_SECRET
    ),
  });
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
  try { await syncYesterday(); } catch (err) { console.error('[cron] meta:', err.message); }
  if (isGoogleAdsConfigured()) {
    try { await syncGoogleYesterday(); } catch (err) { console.error('[cron] gads:', err.message); }
  }
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
    console.log('[startup] Backfilling Meta…');
    syncAll().catch(err => console.error('[startup] meta:', err.message));
  }

  // Auto-migrate GOOGLE_ADS_REFRESH_TOKEN from .env → DB (backward compat)
  const legacyGadsRefresh = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  if (legacyGadsRefresh) {
    const existing = db.prepare(
      "SELECT 1 FROM platform_connections WHERE platform = 'google_ads' LIMIT 1"
    ).get();
    if (!existing) {
      const adminUser = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
      if (adminUser) {
        console.log('[startup] Migracja GOOGLE_ADS_REFRESH_TOKEN z .env → baza danych…');
        db.prepare(`
          INSERT OR IGNORE INTO platform_connections (user_id, platform, config)
          VALUES (?, 'google_ads', ?)
        `).run(adminUser.id, JSON.stringify({
          refresh_token:    legacyGadsRefresh,
          migrated_from_env: true,
          connected_at:     new Date().toISOString(),
        }));
      }
    }
  }

  if (isGoogleAdsConfigured()) {
    const gNeedsBackfill = db.prepare(
      'SELECT COUNT(*) as n FROM google_accounts WHERE synced_at IS NULL'
    ).get().n;
    const gTotal = db.prepare('SELECT COUNT(*) as n FROM google_accounts').get().n;

    if (gTotal === 0 || gNeedsBackfill > 0) {
      console.log('[startup] Backfilling Google Ads…');
      syncAllGoogle().catch(err => console.error('[startup] gads:', err.message));
    }
  } else {
    console.log('[startup] Google Ads nie skonfigurowany — podłącz konto w Ustawieniach');
  }
});
