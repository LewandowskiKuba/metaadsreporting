import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import cron from 'node-cron';
import db from './db/database.js';
import { syncAll, syncYesterday } from './db/sync.js';

const app = express();
const PORT = 3001;
const META_BASE = 'https://graph.facebook.com/v21.0';
const TOKEN = process.env.META_ACCESS_TOKEN;

if (!TOKEN || TOKEN === 'wklej_token_tutaj') {
  console.error('⚠️  Brak META_ACCESS_TOKEN w .env');
  process.exit(1);
}

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// ── Meta API proxy ────────────────────────────────────────────────────────────

app.all('/api/meta/*', async (req, res) => {
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

// ── DB: accounts ──────────────────────────────────────────────────────────────

app.get('/api/db/accounts', (req, res) => {
  const accounts = db.prepare('SELECT * FROM accounts WHERE status = 1 ORDER BY name').all();
  res.json({ data: accounts });
});

// ── DB: daily metrics (for chart) ─────────────────────────────────────────────

app.get('/api/db/metrics/:accountId', (req, res) => {
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

// ── DB: aggregate metrics (for KPI cards) ─────────────────────────────────────

app.get('/api/db/aggregate/:accountId', (req, res) => {
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

  // Derived metrics
  const spend = row?.spend || 0;
  const impressions = row?.impressions || 0;
  const clicks = row?.unique_clicks || row?.clicks || 0;
  const leads = row?.leads || 0;
  const calls = row?.calls || 0;

  const result = {
    ...row,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpl: leads > 0 ? spend / leads : null,
    cvr: clicks > 0 && leads > 0 ? (leads / clicks) * 100 : null,
    cost_per_call: calls > 0 ? spend / calls : null,
    roas: row?.purchase_value > 0 && spend > 0 ? row.purchase_value / spend : null,
  };

  res.json({ data: result });
});

// ── DB: manual sync trigger ───────────────────────────────────────────────────

app.post('/api/db/sync', async (req, res) => {
  try {
    console.log('[sync] Manual sync triggered');
    await syncAll();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Cron: daily at 03:00 CET ──────────────────────────────────────────────────

cron.schedule('0 3 * * *', async () => {
  console.log('[cron] Daily sync starting…');
  try {
    await syncYesterday();
  } catch (err) {
    console.error('[cron] Error:', err.message);
  }
}, { timezone: 'Europe/Warsaw' });

// ── Startup ───────────────────────────────────────────────────────────────────

app.listen(PORT, async () => {
  console.log(`Meta API proxy → http://localhost:${PORT}`);

  // Backfill on first run (accounts with no synced_at)
  const needsBackfill = db.prepare(
    'SELECT COUNT(*) as n FROM accounts WHERE synced_at IS NULL'
  ).get().n;

  const totalAccounts = db.prepare('SELECT COUNT(*) as n FROM accounts').get().n;

  if (totalAccounts === 0 || needsBackfill > 0) {
    console.log('[startup] Running initial sync + backfill (last 90 days)…');
    syncAll().catch(err => console.error('[startup] Sync error:', err.message));
  } else {
    console.log('[startup] DB already populated, skipping backfill');
  }
});
