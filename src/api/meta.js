// All requests go through the local proxy (server.js).
// Token lives in .env on the server. Auth JWT sent from localStorage.

const PROXY = (import.meta.env.VITE_API_URL ?? '') + '/api/meta';

function authHeaders() {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${PROXY}${path}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: authHeaders() });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || `HTTP ${res.status}`);
  }
  return json;
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
