import axios from 'axios';
import db from './database.js';

const META_BASE = 'https://graph.facebook.com/v21.0';

function getToken() {
  return process.env.META_ACCESS_TOKEN;
}

async function metaGet(path, params = {}) {
  const res = await axios.get(`${META_BASE}${path}`, {
    params: { ...params, access_token: getToken() },
    timeout: 30000,
  });
  return res.data;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function sumActions(actions, types) {
  if (!actions) return 0;
  const list = Array.isArray(types) ? types : [types];
  return list.reduce((sum, type) => {
    const a = actions.find(x => x.action_type === type);
    return sum + (a ? parseFloat(a.value) || 0 : 0);
  }, 0);
}

function totalLeads(actions) {
  return sumActions(actions, [
    'lead',
    'offsite_conversion.fb_pixel_lead',
    'contact',
    'submit_application',
    'complete_registration',
    'offsite_conversion.fb_pixel_custom',
  ]);
}

function totalCalls(actions) {
  return sumActions(actions, 'click_to_call_call_confirm');
}

function purchaseValue(actionValues) {
  return sumActions(actionValues, 'purchase');
}

function outboundClicks(arr) {
  if (!arr) return 0;
  const a = arr.find(x => x.action_type === 'outbound_click');
  return a ? parseFloat(a.value) || 0 : 0;
}

// ── date helpers ──────────────────────────────────────────────────────────────

function toDateStr(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function eachDay(since, until) {
  const days = [];
  const cur = new Date(since + 'T00:00:00Z');
  const end = new Date(until + 'T00:00:00Z');
  while (cur <= end) {
    days.push(toDateStr(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateStr(d);
}

// ── upsert prepared statements ────────────────────────────────────────────────

const upsertAccount = db.prepare(`
  INSERT INTO accounts (id, name, currency, status)
  VALUES (@id, @name, @currency, @status)
  ON CONFLICT(id) DO UPDATE SET
    name     = excluded.name,
    currency = excluded.currency,
    status   = excluded.status
`);

const upsertMetric = db.prepare(`
  INSERT INTO daily_metrics
    (account_id, date, spend, impressions, reach, clicks, unique_clicks, outbound_clicks, leads, calls, purchase_value)
  VALUES
    (@account_id, @date, @spend, @impressions, @reach, @clicks, @unique_clicks, @outbound_clicks, @leads, @calls, @purchase_value)
  ON CONFLICT(account_id, date) DO UPDATE SET
    spend           = excluded.spend,
    impressions     = excluded.impressions,
    reach           = excluded.reach,
    clicks          = excluded.clicks,
    unique_clicks   = excluded.unique_clicks,
    outbound_clicks = excluded.outbound_clicks,
    leads           = excluded.leads,
    calls           = excluded.calls,
    purchase_value  = excluded.purchase_value
`);

const markSynced = db.prepare(
  `UPDATE accounts SET synced_at = ? WHERE id = ?`
);

// ── sync one account for a date range ─────────────────────────────────────────

export async function syncAccount(accountId, since, until) {
  const res = await metaGet(`/${accountId}/insights`, {
    fields: 'spend,impressions,reach,clicks,unique_clicks,outbound_clicks,actions,action_values',
    time_range: JSON.stringify({ since, until }),
    time_increment: '1',
    level: 'account',
    limit: '100',
  });

  const byDate = {};
  for (const row of res.data || []) byDate[row.date_start] = row;

  const insertBatch = db.transaction(days => {
    for (const date of days) {
      const d = byDate[date] || {};
      upsertMetric.run({
        account_id:      accountId,
        date,
        spend:           parseFloat(d.spend || 0),
        impressions:     parseInt(d.impressions || 0),
        reach:           parseInt(d.reach || 0),
        clicks:          parseInt(d.clicks || 0),
        unique_clicks:   parseInt(d.unique_clicks || 0),
        outbound_clicks: outboundClicks(d.outbound_clicks),
        leads:           totalLeads(d.actions),
        calls:           totalCalls(d.actions),
        purchase_value:  purchaseValue(d.action_values),
      });
    }
  });

  insertBatch(eachDay(since, until));
  markSynced.run(new Date().toISOString(), accountId);
  console.log(`[sync] ${accountId}  ${since} → ${until}  (${eachDay(since, until).length} days)`);
}

// ── full sync: all accounts ───────────────────────────────────────────────────

export async function syncAll() {
  const accountsRes = await metaGet('/me/adaccounts', {
    fields: 'name,id,account_status,currency',
    limit: '200',
  });

  const accounts = (accountsRes.data || []).filter(a => a.account_status === 1);
  console.log(`[sync] Found ${accounts.length} active accounts`);

  for (const acc of accounts) {
    upsertAccount.run({ id: acc.id, name: acc.name, currency: acc.currency || 'PLN', status: 1 });
  }

  const yesterday = daysAgo(1);
  const threeMonthsAgo = daysAgo(90);

  for (const acc of accounts) {
    try {
      const row = db.prepare('SELECT synced_at FROM accounts WHERE id = ?').get(acc.id);
      const needsBackfill = !row?.synced_at;

      const since = needsBackfill ? threeMonthsAgo : yesterday;
      const until = yesterday;

      if (needsBackfill) {
        console.log(`[sync] Backfilling ${acc.name} (${since} → ${until})`);
      }

      await syncAccount(acc.id, since, until);
    } catch (err) {
      console.error(`[sync] Error for ${acc.name}:`, err.message);
    }
  }

  console.log('[sync] Complete');
}

// ── yesterday-only (for daily cron) ───────────────────────────────────────────

export async function syncYesterday() {
  const yesterday = daysAgo(1);
  const accountsRes = await metaGet('/me/adaccounts', {
    fields: 'name,id,account_status,currency',
    limit: '200',
  });
  const accounts = (accountsRes.data || []).filter(a => a.account_status === 1);

  for (const acc of accounts) {
    upsertAccount.run({ id: acc.id, name: acc.name, currency: acc.currency || 'PLN', status: 1 });
    try {
      await syncAccount(acc.id, yesterday, yesterday);
    } catch (err) {
      console.error(`[sync] Error for ${acc.name}:`, err.message);
    }
  }
}
