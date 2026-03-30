import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { getInsightsBreakdown } from '../api/meta.js';
import {
  formatCurrency, formatNumber, formatPercent,
  getTotalLeads, shortNum,
} from '../utils/formatters.js';

const BREAKDOWN_OPTS = [
  { value: 'age',    label: 'Wiek',         breakdowns: ['age'] },
  { value: 'region', label: 'Region',       breakdowns: ['region'] },
  { value: 'cross',  label: 'Wiek × Region',breakdowns: ['age', 'region'] },
];

const METRIC_OPTS = [
  { value: 'impressions', label: 'Wyświetlenia', fmt: v => formatNumber(v) },
  { value: 'clicks',      label: 'Kliknięcia',   fmt: v => formatNumber(v) },
  { value: 'spend',       label: 'Wydatki',      fmt: (v, c) => formatCurrency(v, c) },
  { value: 'ctr',         label: 'CTR',          fmt: v => formatPercent(v) },
  { value: 'cpl',         label: 'CPL',          fmt: (v, c) => v !== null ? formatCurrency(v, c) : '—' },
];

const BAR_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16',
  '#f97316', '#6366f1',
];

function enrichRow(item) {
  const leads = getTotalLeads(item.actions);
  const spend = parseFloat(item.spend || 0);
  return {
    ...item,
    _impressions: parseFloat(item.impressions || 0),
    _clicks:      parseFloat(item.clicks || 0),
    _spend:       spend,
    _ctr:         parseFloat(item.ctr || 0),
    _leads:       leads,
    _cpl:         leads > 0 && spend > 0 ? spend / leads : null,
    _label:       item.age && item.region
      ? `${item.age} / ${item.region}`
      : (item.age || item.region || '—'),
  };
}

function CrossTable({ rows, metric, currency }) {
  // Build pivot: rows = ages, cols = regions
  const ages    = [...new Set(rows.map(r => r.age))].sort();
  const regions = [...new Set(rows.map(r => r.region))].sort();

  const getValue = (age, region) => {
    const row = rows.find(r => r.age === age && r.region === region);
    if (!row) return null;
    const key = `_${metric === 'cpl' ? 'cpl' : metric}`;
    return row[key];
  };

  const fmt = METRIC_OPTS.find(m => m.value === metric)?.fmt || formatNumber;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left py-2 px-3 text-gray-500 bg-gray-50 border border-gray-200 font-medium sticky left-0 z-10">
              Wiek \ Region
            </th>
            {regions.map(r => (
              <th key={r} className="py-2 px-3 text-gray-600 bg-gray-50 border border-gray-200 font-medium whitespace-nowrap">
                {r}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ages.map((age, i) => (
            <tr key={age} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
              <td className="py-2 px-3 font-medium text-gray-700 border border-gray-200 sticky left-0 bg-inherit">
                {age}
              </td>
              {regions.map(region => {
                const val = getValue(age, region);
                return (
                  <td key={region} className="py-2 px-3 text-right text-gray-700 border border-gray-100 tabular-nums">
                    {val !== null && val !== undefined ? fmt(val, currency) : <span className="text-gray-300">—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function BreakdownSection({ accountId, dateRange, currency }) {
  const [breakdownKey, setBreakdownKey] = useState('age');
  const [metric, setMetric]             = useState('impressions');
  const [viewMode, setViewMode]         = useState('chart');
  const [data, setData]                 = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);

  const breakdownOpt = BREAKDOWN_OPTS.find(b => b.value === breakdownKey);

  useEffect(() => {
    if (!accountId) return;
    setLoading(true);
    setError(null);
    getInsightsBreakdown(accountId, dateRange, breakdownOpt.breakdowns)
      .then(res => setData((res.data || []).map(enrichRow)))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [accountId, dateRange, breakdownKey]);

  const isCross = breakdownKey === 'cross';
  const metricKey = `_${metric === 'cpl' ? 'cpl' : metric}`;
  const fmtFn = METRIC_OPTS.find(m => m.value === metric)?.fmt || formatNumber;

  const chartData = [...data]
    .sort((a, b) => (parseFloat(b[metricKey]) || 0) - (parseFloat(a[metricKey]) || 0))
    .slice(0, 20);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium text-gray-800 mb-1">{label}</p>
        <p className="text-gray-600">{fmtFn(payload[0].value, currency)}</p>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-1">
          {BREAKDOWN_OPTS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setBreakdownKey(opt.value); setViewMode(opt.value === 'cross' ? 'table' : 'chart'); }}
              className={breakdownKey === opt.value ? 'tab-active' : 'tab-inactive'}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-500">Metryka:</span>
          <select
            value={metric}
            onChange={e => setMetric(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {METRIC_OPTS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {!isCross && (
            <div className="flex border border-gray-200 rounded-lg overflow-hidden text-xs">
              {[
                { id: 'chart', icon: '📊 Wykres' },
                { id: 'table', icon: '📋 Tabela' },
              ].map(v => (
                <button
                  key={v.id}
                  onClick={() => setViewMode(v.id)}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    viewMode === v.id ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {v.icon}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      {loading && (
        <div className="flex items-center justify-center h-52 text-gray-400 gap-2">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Ładowanie...</span>
        </div>
      )}

      {!loading && error && (
        <div className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="flex items-center justify-center h-52 text-gray-400 text-sm">
          Brak danych dla wybranego okresu
        </div>
      )}

      {!loading && !error && data.length > 0 && isCross && (
        <CrossTable rows={data} metric={metric} currency={currency} />
      )}

      {!loading && !error && data.length > 0 && !isCross && viewMode === 'chart' && (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 30, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis
              dataKey="_label"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              angle={breakdownKey === 'region' ? -35 : 0}
              textAnchor={breakdownKey === 'region' ? 'end' : 'middle'}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis tickFormatter={shortNum} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={metricKey} radius={[4, 4, 0, 0]} maxBarSize={40}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}

      {!loading && !error && data.length > 0 && !isCross && viewMode === 'table' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {[
                  breakdownOpt.label, 'Wyświetlenia', 'Kliknięcia',
                  'Wydatki', 'CTR', 'Leady', 'CPL',
                ].map(h => (
                  <th key={h} className="text-left py-2.5 px-3 text-gray-500 font-medium text-xs first:text-left text-right first:text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chartData.map((row, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-gray-800">{row._label}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatNumber(row._impressions)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatNumber(row._clicks)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatCurrency(row._spend, currency)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{formatPercent(row._ctr)}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{row._leads > 0 ? formatNumber(row._leads) : '—'}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{row._cpl !== null ? formatCurrency(row._cpl, currency) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
