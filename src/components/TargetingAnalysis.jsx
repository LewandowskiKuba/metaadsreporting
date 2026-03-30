import { useState, useEffect } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { getInsightsBreakdown } from '../api/meta.js';

function fmt(n) { return Number(n || 0).toLocaleString('pl-PL'); }
function fmtPLN(n) { return `${Number(n || 0).toFixed(2)} PLN`; }

function Table({ data, loading }) {
  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Ładowanie…</div>;
  if (!data.length) return <div className="py-12 text-center text-gray-400 text-sm">Brak danych</div>;
  return (
    <div className="bg-white rounded-[12px] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            {['Segment', 'Wyświetlenia', 'Kliknięcia', 'Wydatki', 'CPL'].map(h => (
              <th key={h} className={`py-3 px-6 text-sm font-semibold text-gray-700 ${h === 'Segment' ? 'text-left' : 'text-right'}`}>
                <div className={`flex items-center gap-2 ${h !== 'Segment' ? 'justify-end' : ''}`}>
                  {h} <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.segment} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="py-3 px-6 font-medium text-gray-900">{row.segment}</td>
              <td className="py-3 px-6 text-right text-gray-900">{fmt(row.impressions)}</td>
              <td className="py-3 px-6 text-right text-gray-900">{fmt(row.clicks)}</td>
              <td className="py-3 px-6 text-right text-gray-900">{fmtPLN(row.spend)}</td>
              <td className="py-3 px-6 text-right text-gray-900">{row.cpl ? fmtPLN(row.cpl) : '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function parseBreakdown(data, key) {
  return (data || []).map(d => {
    const leads = (d.actions || []).find(a => a.action_type === 'lead')?.value || 0;
    const spend = parseFloat(d.spend || 0);
    const cpl = leads > 0 ? spend / leads : null;
    return { segment: d[key], impressions: d.impressions, clicks: d.clicks, spend, cpl };
  });
}

export function TargetingAnalysis({ accountId, dateRange }) {
  const [activeTab, setActiveTab] = useState('age');
  const [ageData, setAgeData] = useState([]);
  const [regionData, setRegionData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accountId || !dateRange) return;
    setLoading(true);
    Promise.all([
      getInsightsBreakdown(accountId, dateRange, ['age']),
      getInsightsBreakdown(accountId, dateRange, ['region']),
    ]).then(([age, region]) => {
      setAgeData(parseBreakdown(age.data, 'age'));
      setRegionData(parseBreakdown(region.data, 'region'));
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [accountId, dateRange]);

  const tabs = [
    { value: 'age', label: 'Wiek', data: ageData },
    { value: 'region', label: 'Region', data: regionData },
  ];

  return (
    <div>
      <div className="flex gap-1 bg-gray-100 border border-gray-200 rounded-lg p-1 w-fit mb-6">
        {tabs.map(t => (
          <button
            key={t.value}
            onClick={() => setActiveTab(t.value)}
            className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${
              activeTab === t.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <Table data={tabs.find(t => t.value === activeTab)?.data || []} loading={loading} />
    </div>
  );
}
