// All requests go through the local proxy (server.js).
// The Meta token lives in .env on the server — never in the browser.

const PROXY = 'http://localhost:3001/api/meta';

async function apiFetch(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${PROXY}${path}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || `HTTP ${res.status}`);
  }
  return json;
}

export async function getAdAccounts() {
  return apiFetch('/me/adaccounts', {
    fields: 'name,id,account_status,currency,amount_spent,balance,funding_source_details',
    limit: '200',
  });
}

export async function getInsights(accountId, { since, until }) {
  return apiFetch(`/${accountId}/insights`, {
    fields: [
      'spend', 'impressions', 'reach', 'cpm', 'cpc', 'ctr',
      'actions', 'action_values', 'outbound_clicks', 'unique_clicks',
    ].join(','),
    time_range: JSON.stringify({ since, until }),
    level: 'account',
  });
}

export async function getInsightsTimeSeries(accountId, { since, until }) {
  return apiFetch(`/${accountId}/insights`, {
    fields: 'spend,impressions,reach,clicks,actions',
    time_range: JSON.stringify({ since, until }),
    time_increment: '1',
    level: 'account',
    limit: '90',
  });
}

export async function getInsightsBreakdown(accountId, { since, until }, breakdowns) {
  return apiFetch(`/${accountId}/insights`, {
    fields: 'spend,impressions,reach,clicks,cpm,cpc,ctr,actions',
    time_range: JSON.stringify({ since, until }),
    breakdowns: breakdowns.join(','),
    level: 'account',
    limit: '500',
  });
}

export async function getAds(accountId, { since, until }) {
  const insightFields = 'impressions,reach,clicks,spend,cpm,cpc,ctr,actions,action_values,outbound_clicks';
  const timeRange = JSON.stringify({ since, until });
  return apiFetch(`/${accountId}/ads`, {
    fields: `name,status,creative{id,name,image_url,body,title,call_to_action_type},insights.time_range(${timeRange}){${insightFields}}`,
    limit: '50',
    filtering: JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE', 'PAUSED', 'ARCHIVED'] }]),
  });
}

export async function getAdPreview(adId) {
  return apiFetch(`/${adId}/previews`, {
    ad_format: 'DESKTOP_FEED_STANDARD',
  });
}
