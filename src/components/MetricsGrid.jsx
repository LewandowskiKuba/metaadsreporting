import React from 'react';
import MetricCard from './MetricCard.jsx';
import {
  formatCurrency, formatNumber, formatPercent,
  getTotalLeads, getCallCount, getOutboundClicks, getActionValue,
} from '../utils/formatters.js';

function SkeletonGrid({ count = 12 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="metric-card space-y-2">
          <div className="skeleton h-4 w-3/4 rounded" />
          <div className="skeleton h-7 w-1/2 rounded" />
        </div>
      ))}
    </div>
  );
}

export default function MetricsGrid({ insights, currency = 'PLN' }) {
  if (!insights) return <SkeletonGrid />;

  const {
    spend, impressions, reach, cpm, cpc, ctr,
    actions, action_values, outbound_clicks, unique_clicks,
  } = insights;

  const leads = getTotalLeads(actions);
  const calls = getCallCount(actions);
  const outbound = getOutboundClicks(outbound_clicks);
  const clicks = parseFloat(unique_clicks || 0);
  const spendF = parseFloat(spend || 0);

  const cpl = leads > 0 && spendF > 0 ? spendF / leads : null;
  const cvr = clicks > 0 && leads > 0 ? (leads / clicks) * 100 : null;
  const costPerCall = calls > 0 && spendF > 0 ? spendF / calls : null;
  const purchaseValue = getActionValue(action_values, 'purchase');
  const roas = purchaseValue > 0 && spendF > 0 ? purchaseValue / spendF : null;

  const groups = [
    {
      label: 'Zasięg i kliknięcia',
      metrics: [
        { label: 'Wyświetlenia',         value: formatNumber(impressions),     icon: '👁',  color: 'blue' },
        { label: 'Zasięg (użytkownicy)', value: formatNumber(reach),           icon: '👥',  color: 'blue' },
        { label: 'Kliknięcia (wszystkie)',value: formatNumber(unique_clicks),  icon: '🖱️',  color: 'blue' },
        { label: 'Kliknięcia do strony', value: formatNumber(outbound),        icon: '🔗',  color: 'blue' },
      ],
    },
    {
      label: 'Konwersje',
      metrics: [
        { label: 'Leady (łącznie)',    value: leads > 0 ? formatNumber(leads) : '—',  icon: '📋', color: 'green' },
        ...(calls > 0 ? [
          { label: 'Połączenia (ClickToCall)', value: formatNumber(calls), icon: '📞', color: 'green' },
        ] : []),
        ...(roas !== null ? [
          { label: 'ROAS', value: `${roas.toFixed(2)}x`, icon: '💰', color: 'green',
            subValue: `Przychód: ${formatCurrency(purchaseValue, currency)}` },
        ] : []),
      ],
    },
    {
      label: 'Metryki mediowe',
      metrics: [
        { label: 'Wydatki',          value: formatCurrency(spend, currency),                          icon: '💸', color: 'orange' },
        { label: 'CPM',              value: formatCurrency(cpm, currency),                             icon: '📊', color: 'orange' },
        { label: 'CPC',              value: formatCurrency(cpc, currency),                             icon: '🖱️', color: 'orange' },
        { label: 'CTR',              value: formatPercent(ctr),                                        icon: '📈', color: 'orange' },
        { label: 'CVR',              value: cvr !== null ? formatPercent(cvr) : '—',                   icon: '🎯', color: 'orange' },
        { label: 'CPL',              value: cpl !== null ? formatCurrency(cpl, currency) : '—',        icon: '💵', color: 'orange' },
        ...(costPerCall !== null ? [
          { label: 'Koszt połączenia', value: formatCurrency(costPerCall, currency), icon: '📞', color: 'orange' },
        ] : []),
      ],
    },
  ];

  return (
    <div className="space-y-5">
      {groups.map(group => (
        <div key={group.label}>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2.5">
            {group.label}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
            {group.metrics.map(m => (
              <MetricCard key={m.label} {...m} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
