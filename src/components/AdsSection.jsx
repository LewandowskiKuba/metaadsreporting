import React, { useState, useEffect } from 'react';
import { getAds, getAdPreview } from '../api/meta.js';
import {
  formatCurrency, formatNumber, formatPercent,
  getTotalLeads, getCallCount, getOutboundClicks,
} from '../utils/formatters.js';

const STATUS_STYLES = {
  ACTIVE:   'bg-green-100 text-green-700',
  PAUSED:   'bg-yellow-100 text-yellow-700',
  ARCHIVED: 'bg-gray-100  text-gray-500',
};
const STATUS_LABELS = {
  ACTIVE: 'Aktywna', PAUSED: 'Wstrzymana', ARCHIVED: 'Zarchiwizowana',
};

const SORT_OPTS = [
  { value: 'spend',       label: 'Wydatki' },
  { value: 'impressions', label: 'Wyświetlenia' },
  { value: 'clicks',      label: 'Kliknięcia' },
  { value: 'leads',       label: 'Leady' },
  { value: 'cpl',         label: 'CPL (rosnąco)' },
];

function AdPreviewPanel({ adId }) {
  const [html, setHtml] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAdPreview(adId)
      .then(res => {
        const body = res?.data?.[0]?.body;
        setHtml(body || null);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [adId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-24 text-gray-400 gap-2 text-sm">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        Ładowanie podglądu...
      </div>
    );
  }
  if (error) return <p className="text-xs text-red-500 p-2">{error}</p>;
  if (!html) return <p className="text-xs text-gray-400 p-2">Brak podglądu</p>;

  // Extract iframe src and render clean iframe
  const match = html.match(/src="([^"]+)"/);
  if (match) {
    return (
      <div className="mt-3 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 flex justify-center p-3">
        <iframe
          src={match[1]}
          title="Podgląd reklamy"
          className="border-0 rounded"
          style={{ width: 320, height: 380 }}
          sandbox="allow-same-origin allow-scripts allow-popups"
        />
      </div>
    );
  }

  // Fallback: render raw HTML
  return (
    <div
      className="mt-3 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 p-3"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function AdRow({ ad, currency }) {
  const [previewOpen, setPreviewOpen] = useState(false);

  const insights = ad.insights?.data?.[0] || {};
  const { spend, impressions, reach, clicks, cpm, cpc, ctr, actions, action_values, outbound_clicks } = insights;

  const leads    = getTotalLeads(actions);
  const calls    = getCallCount(actions);
  const outbound = getOutboundClicks(outbound_clicks);
  const spendF   = parseFloat(spend || 0);
  const cpl      = leads > 0 && spendF > 0 ? spendF / leads : null;
  const costCall = calls > 0 && spendF > 0 ? spendF / calls : null;

  const creative = ad.creative || {};
  const hasMetrics = impressions > 0 || spendF > 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors">
      <div className="flex items-start gap-4 p-4">
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
          {creative.image_url ? (
            <img
              src={creative.image_url}
              alt={ad.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl text-gray-300">
              📷
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight">{ad.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_STYLES[ad.status] || STATUS_STYLES.ARCHIVED}`}>
              {STATUS_LABELS[ad.status] || ad.status}
            </span>
          </div>
          {creative.title && (
            <p className="text-xs text-gray-600 truncate">{creative.title}</p>
          )}
          {creative.body && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">{creative.body}</p>
          )}
        </div>
      </div>

      {/* Metrics grid */}
      <div className="px-4 pb-4">
        {hasMetrics ? (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-x-4 gap-y-2 py-3 border-t border-gray-100">
            {[
              { label: 'Wydatki',     value: formatCurrency(spend, currency) },
              { label: 'Wyświetlenia',value: formatNumber(impressions) },
              { label: 'Zasięg',      value: formatNumber(reach) },
              { label: 'Kliknięcia',  value: formatNumber(clicks) },
              { label: 'Outbound',    value: formatNumber(outbound) || '—' },
              { label: 'CPM',         value: formatCurrency(cpm, currency) },
              { label: 'CPC',         value: formatCurrency(cpc, currency) },
              { label: 'CTR',         value: formatPercent(ctr) },
              ...(leads > 0 ? [
                { label: 'Leady',     value: formatNumber(leads) },
                { label: 'CPL',       value: formatCurrency(cpl, currency) },
              ] : []),
              ...(calls > 0 ? [
                { label: 'Połączenia', value: formatNumber(calls) },
                { label: 'Koszt połącz.', value: formatCurrency(costCall, currency) },
              ] : []),
            ].map((m, i) => (
              <div key={i}>
                <p className="text-xs text-gray-400">{m.label}</p>
                <p className="text-sm font-semibold text-gray-800 tabular-nums">{m.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 py-2 border-t border-gray-100">
            Brak danych dla wybranego okresu
          </p>
        )}

        {/* Preview toggle */}
        {ad.id && (
          <button
            onClick={() => setPreviewOpen(v => !v)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-1 transition-colors"
          >
            {previewOpen ? '▲ Ukryj podgląd' : '▼ Podgląd reklamy'}
          </button>
        )}

        {previewOpen && (
          <AdPreviewPanel adId={ad.id} />
        )}
      </div>
    </div>
  );
}

export default function AdsSection({ accountId, dateRange, currency }) {
  const [ads, setAds]           = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [sortBy, setSortBy]     = useState('spend');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    getAds(accountId, dateRange)
      .then(res => setAds(res.data || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [accountId, dateRange]);

  const statuses = ['ALL', 'ACTIVE', 'PAUSED', 'ARCHIVED'];

  const filtered = ads
    .filter(ad => statusFilter === 'ALL' || ad.status === statusFilter)
    .sort((a, b) => {
      const iA = a.insights?.data?.[0] || {};
      const iB = b.insights?.data?.[0] || {};
      if (sortBy === 'leads') {
        return getTotalLeads(iB.actions) - getTotalLeads(iA.actions);
      }
      if (sortBy === 'cpl') {
        const lA = getTotalLeads(iA.actions); const lB = getTotalLeads(iB.actions);
        const cA = lA > 0 ? parseFloat(iA.spend || 0) / lA : Infinity;
        const cB = lB > 0 ? parseFloat(iB.spend || 0) / lB : Infinity;
        return cA - cB; // ascending for CPL
      }
      return parseFloat(iB[sortBy] || 0) - parseFloat(iA[sortBy] || 0);
    });

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={statusFilter === s ? 'tab-active' : 'tab-inactive'}
            >
              {s === 'ALL' ? 'Wszystkie' : STATUS_LABELS[s] || s}
              {s !== 'ALL' && (
                <span className="ml-1.5 text-xs opacity-70">
                  ({ads.filter(a => a.status === s).length})
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-500">Sortuj wg:</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {SORT_OPTS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="flex items-center justify-center h-40 text-gray-400 gap-2">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Ładowanie reklam...</span>
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">{error}</div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
          Brak reklam dla wybranych filtrów
        </div>
      )}

      {!loading && !error && filtered.map(ad => (
        <AdRow key={ad.id} ad={ad} currency={currency} />
      ))}

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-right">
          Pokazuję {filtered.length} z {ads.length} reklam
        </p>
      )}
    </div>
  );
}
