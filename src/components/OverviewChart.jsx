import React, { useState } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';
import { formatDateShort, shortNum } from '../utils/formatters.js';

const METRICS = [
  { key: 'impressions', label: 'Wyświetlenia', color: '#3b82f6' },
  { key: 'reach',       label: 'Zasięg',        color: '#8b5cf6' },
  { key: 'clicks',      label: 'Kliknięcia',    color: '#10b981' },
  { key: 'spend',       label: 'Wydatki (PLN)', color: '#f59e0b' },
];

function processData(rawData) {
  return (rawData || []).map(d => ({
    date: formatDateShort(d.date || d.date_start),
    impressions: parseFloat(d.impressions || 0),
    reach:       parseFloat(d.reach || 0),
    clicks:      parseFloat(d.clicks || 0),
    spend:       parseFloat(d.spend || 0),
  }));
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-600">{METRICS.find(m => m.key === p.dataKey)?.label}:</span>
          <span className="font-medium">{shortNum(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function OverviewChart({ data }) {
  const [active, setActive] = useState(['impressions', 'reach', 'clicks']);
  const [chartType, setChartType] = useState('line');

  const chartData = processData(data);

  const toggle = key =>
    setActive(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  if (!chartData.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 flex items-center justify-center h-52 text-gray-400 text-sm">
        Brak danych dla wybranego okresu
      </div>
    );
  }

  const Chart = chartType === 'bar' ? BarChart : LineChart;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h3 className="font-semibold text-gray-900">Trend dzienny</h3>

        <div className="flex flex-wrap items-center gap-2">
          {/* Metric toggles */}
          <div className="flex flex-wrap gap-1.5">
            {METRICS.map(m => (
              <button
                key={m.key}
                onClick={() => toggle(m.key)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                  active.includes(m.key)
                    ? 'text-white border-transparent'
                    : 'text-gray-500 border-gray-200 hover:border-gray-300 bg-white'
                }`}
                style={active.includes(m.key) ? { backgroundColor: m.color, borderColor: m.color } : {}}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Chart type toggle */}
          <div className="flex border border-gray-200 rounded-lg overflow-hidden text-xs">
            {[
              { id: 'line', icon: '📈', label: 'Linia' },
              { id: 'bar',  icon: '📊', label: 'Słupki' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setChartType(t.id)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  chartType === t.id ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <Chart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={shortNum} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          {METRICS.filter(m => active.includes(m.key)).map(m =>
            chartType === 'bar'
              ? <Bar key={m.key} dataKey={m.key} fill={m.color} radius={[3, 3, 0, 0]} maxBarSize={24} />
              : <Line key={m.key} type="monotone" dataKey={m.key} stroke={m.color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
