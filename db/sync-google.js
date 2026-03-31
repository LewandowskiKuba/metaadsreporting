import axios from 'axios';
import db from './database.js';

const GADS_VERSION = 'v18';
const GADS_BASE = `https://googleads.googleapis.com/${GADS_VERSION}`;
const OAUTH_URL = 'https://oauth2.googleapis.com/token';

// ── OAuth2 token cache ────────────────────────────────────────────────────────

let _cachedToken = null;
let _tokenExpiry = 0;

function getRefreshToken() {
  const conn = db.prepare(
    "SELECT config FROM platform_connections WHERE platform = 'google_ads' ORDER BY connected_at DESC LIMIT 1"
  ).get();
  if (!conn) throw new Error('Brak połączenia z Google Ads — podłącz konto w Ustawieniach');
  return JSON.parse(conn.config).refresh_token;
}

async function getAccessToken() {
  if (_cachedToken && Date.now() < _tokenExpiry - 60_000) return _cachedToken;

  const refreshToken = getRefreshToken();

  const res = await axios.post(OAUTH_URL, {
    grant_type:    'refresh_token',
    client_id:     process.env.GOOGLE_ADS_CLIENT_ID,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
    refresh_token: refreshToken,
  });

  _cachedToken = res.data.access_token;
  _tokenExpiry = Date.now() + res.data.expires_in * 1000;
  return _cachedToken;
}

function gadsHeaders() {
  return getAccessToken().then(token => {
    const h = {
      Authorization:    `Bearer ${token}`,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
    };
    const mgr = process.env.GOOGLE_ADS_MANAGER_ID;
    if (mgr) h['login-customer-id'] = mgr.replace(/-/g, '');
    return h;
  });
}

// ── GAQL search ───────────────────────────────────────────────────────────────

async function gadsSearch(customerId, query) {
  const headers = await gadsHeaders();
  const cleanId = customerId.replace(/-/g, '');

  let results = [];
  let pageToken = null;

  do {
    const body = { query };
    if (pageToken) body.pageToken = pageToken;

    const res = await axios.post(
      `${GADS_BASE}/customers/${cleanId}/googleAds:search`,
      body,
      { headers, timeout: 30_000 }
    );

    results = results.concat(res.data.results || []);
    pageToken = res.data.nextPageToken || null;
  } while (pageToken);

  return results;
}

// ── List accessible customer IDs ──────────────────────────────────────────────

async function listAccessibleCustomers() {
  const headers = await gadsHeaders();
  const res = await axios.get(
    `${GADS_BASE}/customers:listAccessibleCustomers`,
    { headers, timeout: 15_000 }
  );
  return (res.data.resourceNames || []).map(rn => rn.split('/')[1]);
}

// ── Fetch customer info (name, currency) ──────────────────────────────────────

async function getCustomerInfo(customerId) {
  const rows = await gadsSearch(customerId, `
    SELECT
      customer.id,
      customer.descriptive_name,
      customer.currency_code,
      customer.status,
      customer.manager
    FROM customer
    LIMIT 1
  `);
  const c = rows[0]?.customer || {};
  return {
    id:       String(c.id || customerId),
    name:     c.descriptiveName || `Konto ${customerId}`,
    currency: c.currencyCode   || 'PLN',
    status:   c.status === 'ENABLED' ? 1 : 0,
    manager:  !!c.manager,
  };
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function toDateStr(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateStr(d);
}

// ── Prepared statements ───────────────────────────────────────────────────────

const upsertGoogleAccount = db.prepare(`
  INSERT INTO google_accounts (id, name, currency, status)
  VALUES (@id, @name, @currency, @status)
  ON CONFLICT(id) DO UPDATE SET
    name     = excluded.name,
    currency = excluded.currency,
    status   = excluded.status
`);

const upsertGoogleMetric = db.prepare(`
  INSERT INTO google_daily_metrics
    (account_id, date, spend, impressions, clicks, conversions,
     video_views, video_impressions, video_p25, video_p50, video_p75, video_p100)
  VALUES
    (@account_id, @date, @spend, @impressions, @clicks, @conversions,
     @video_views, @video_impressions, @video_p25, @video_p50, @video_p75, @video_p100)
  ON CONFLICT(account_id, date) DO UPDATE SET
    spend             = excluded.spend,
    impressions       = excluded.impressions,
    clicks            = excluded.clicks,
    conversions       = excluded.conversions,
    video_views       = excluded.video_views,
    video_impressions = excluded.video_impressions,
    video_p25         = excluded.video_p25,
    video_p50         = excluded.video_p50,
    video_p75         = excluded.video_p75,
    video_p100        = excluded.video_p100
`);

const markGoogleSynced = db.prepare(
  `UPDATE google_accounts SET synced_at = ? WHERE id = ?`
);

// ── Sync one customer for a date range ────────────────────────────────────────

export async function syncGoogleCustomer(customerId, since, until) {
  const cleanId = customerId.replace(/-/g, '');

  const rows = await gadsSearch(cleanId, `
    SELECT
      segments.date,
      metrics.impressions,
      metrics.cost_micros,
      metrics.clicks,
      metrics.conversions,
      metrics.video_views,
      metrics.video_quartile_p25_rate,
      metrics.video_quartile_p50_rate,
      metrics.video_quartile_p75_rate,
      metrics.video_quartile_p100_rate
    FROM campaign
    WHERE segments.date BETWEEN '${since}' AND '${until}'
      AND campaign.status != 'REMOVED'
  `);

  // Aggregate by date
  const byDate = {};

  for (const row of rows) {
    const date = row.segments?.date;
    if (!date) continue;

    if (!byDate[date]) {
      byDate[date] = {
        spend: 0, impressions: 0, clicks: 0, conversions: 0,
        video_views: 0, video_impressions: 0,
        video_p25_abs: 0, video_p50_abs: 0, video_p75_abs: 0, video_p100_abs: 0,
      };
    }

    const m   = row.metrics || {};
    const imp = parseInt(m.impressions || 0);
    const vv  = parseInt(m.videoViews  || 0);

    byDate[date].spend       += (parseInt(m.costMicros || 0)) / 1_000_000;
    byDate[date].impressions += imp;
    byDate[date].clicks      += parseInt(m.clicks      || 0);
    byDate[date].conversions += parseFloat(m.conversions || 0);
    byDate[date].video_views += vv;

    // Track quartile absolutes only for campaigns with video views
    if (vv > 0) {
      byDate[date].video_impressions += imp;
      byDate[date].video_p25_abs     += (parseFloat(m.videoQuartileP25Rate  || 0)) * imp;
      byDate[date].video_p50_abs     += (parseFloat(m.videoQuartileP50Rate  || 0)) * imp;
      byDate[date].video_p75_abs     += (parseFloat(m.videoQuartileP75Rate  || 0)) * imp;
      byDate[date].video_p100_abs    += (parseFloat(m.videoQuartileP100Rate || 0)) * imp;
    }
  }

  // Upsert into DB
  const insertBatch = db.transaction(entries => {
    for (const [date, d] of entries) {
      const vi = d.video_impressions;
      upsertGoogleMetric.run({
        account_id:        cleanId,
        date,
        spend:             Math.round(d.spend * 100) / 100,
        impressions:       d.impressions,
        clicks:            d.clicks,
        conversions:       d.conversions,
        video_views:       d.video_views,
        video_impressions: vi,
        video_p25:         vi > 0 ? (d.video_p25_abs  / vi) * 100 : 0,
        video_p50:         vi > 0 ? (d.video_p50_abs  / vi) * 100 : 0,
        video_p75:         vi > 0 ? (d.video_p75_abs  / vi) * 100 : 0,
        video_p100:        vi > 0 ? (d.video_p100_abs / vi) * 100 : 0,
      });
    }
  });

  insertBatch(Object.entries(byDate));
  markGoogleSynced.run(new Date().toISOString(), cleanId);
  console.log(`[gads] ${cleanId}  ${since} → ${until}`);
}

// ── Full sync: discover all accounts ─────────────────────────────────────────

export async function syncAllGoogle() {
  let customerIds;

  const configured = process.env.GOOGLE_ADS_CUSTOMER_IDS;
  if (configured) {
    customerIds = configured.split(',').map(id => id.trim().replace(/-/g, ''));
  } else {
    customerIds = await listAccessibleCustomers();
  }

  console.log(`[gads] Found ${customerIds.length} customer(s)`);

  const yesterday      = daysAgo(1);
  const threeMonthsAgo = daysAgo(90);

  for (const id of customerIds) {
    try {
      const info = await getCustomerInfo(id);

      // Skip manager (MCC) accounts — they have no own spend
      if (info.manager) {
        console.log(`[gads] Skipping manager account ${id}`);
        continue;
      }

      upsertGoogleAccount.run({ id: info.id, name: info.name, currency: info.currency, status: info.status });

      const row         = db.prepare('SELECT synced_at FROM google_accounts WHERE id = ?').get(info.id);
      const needsBackfill = !row?.synced_at;
      const since       = needsBackfill ? threeMonthsAgo : yesterday;

      if (needsBackfill) console.log(`[gads] Backfilling ${info.name} (${since} → ${yesterday})`);

      await syncGoogleCustomer(info.id, since, yesterday);
    } catch (err) {
      console.error(`[gads] Error for ${id}:`, err.response?.data?.error?.message || err.message);
    }
  }

  console.log('[gads] Complete');
}

// ── Yesterday-only (for daily cron) ──────────────────────────────────────────

export async function syncGoogleYesterday() {
  const yesterday   = daysAgo(1);
  const accounts    = db.prepare('SELECT id FROM google_accounts WHERE status = 1').all();

  for (const { id } of accounts) {
    try {
      await syncGoogleCustomer(id, yesterday, yesterday);
    } catch (err) {
      console.error(`[gads] Error for ${id}:`, err.response?.data?.error?.message || err.message);
    }
  }
}

// ── Check if Google Ads credentials are configured ───────────────────────────

export function isGoogleAdsConfigured() {
  const appCredsOk = !!(
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
    process.env.GOOGLE_ADS_CLIENT_ID &&
    process.env.GOOGLE_ADS_CLIENT_SECRET
  );
  if (!appCredsOk) return false;
  const conn = db.prepare(
    "SELECT 1 FROM platform_connections WHERE platform = 'google_ads' LIMIT 1"
  ).get();
  return !!conn;
}
