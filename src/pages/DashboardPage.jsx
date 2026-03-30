import { useState, useEffect } from 'react';
import { Navigation } from '../components/Navigation.jsx';
import { MetricCard } from '../components/MetricCard.jsx';
import { PerformanceChart } from '../components/PerformanceChart.jsx';
import { TargetingAnalysis } from '../components/TargetingAnalysis.jsx';
import { AdCards } from '../components/AdCards.jsx';
import { getDbAccounts, getDbAggregate, getDbMetrics } from '../api/local.js';

function defaultDateRange() {
  const today = new Date();
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const from = new Date(today); from.setDate(today.getDate() - 30);
  const to = new Date(today); to.setDate(today.getDate() - 1);
  return { since: fmt(from), until: fmt(to) };
}

function fmtNum(n, decimals = 0) {
  if (n == null) return '–';
  return Number(n).toLocaleString('pl-PL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function DashboardPage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [dateRange, setDateRange] = useState(defaultDateRange);
  const [agg, setAgg] = useState(null);
  const [timeSeries, setTimeSeries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getDbAccounts().then(res => {
      const accs = res.data || [];
      setAccounts(accs);
      if (accs.length > 0) setSelectedAccount(accs[0]);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedAccount) return;
    setLoading(true);
    setAgg(null);
    setTimeSeries([]);
    Promise.all([
      getDbAggregate(selectedAccount.id, dateRange),
      getDbMetrics(selectedAccount.id, dateRange),
    ]).then(([aggRes, tsRes]) => {
      setAgg(aggRes.data);
      setTimeSeries(tsRes.data || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedAccount, dateRange]);

  const currency = selectedAccount?.currency || 'PLN';

  const metrics = agg ? [
    { name: 'Wydatki', value: fmtNum(agg.spend, 2), unit: currency },
    { name: 'Wyświetlenia', value: fmtNum(agg.impressions), unit: '' },
    { name: 'Zasięg', value: fmtNum(agg.reach), unit: '' },
    { name: 'Kliknięcia', value: fmtNum(agg.clicks), unit: '' },
    { name: 'Unikalne kliknięcia', value: fmtNum(agg.unique_clicks), unit: '' },
    { name: 'CPM', value: fmtNum(agg.cpm, 2), unit: currency },
    { name: 'CPC', value: fmtNum(agg.cpc, 2), unit: currency },
    { name: 'CTR', value: fmtNum(agg.ctr, 2), unit: '%' },
    ...(agg.leads > 0 ? [{ name: 'Leady', value: fmtNum(agg.leads), unit: '' }] : []),
    ...(agg.cpl > 0 ? [{ name: 'CPL', value: fmtNum(agg.cpl, 2), unit: currency }] : []),
    ...(agg.calls > 0 ? [{ name: 'Połączenia', value: fmtNum(agg.calls), unit: '' }] : []),
    ...(agg.roas > 0 ? [{ name: 'ROAS', value: fmtNum(agg.roas, 2), unit: 'x' }] : []),
  ] : [];

  return (
    <div className="min-h-screen bg-white">
      <Navigation
        accounts={accounts}
        selectedAccount={selectedAccount}
        onSelectAccount={setSelectedAccount}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onSync={() => window.location.reload()}
      />

      <main className="max-w-[1400px] mx-auto px-8 py-8">
        {!selectedAccount && (
          <div className="text-center py-20 text-gray-400">
            <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm">Ładowanie kont…</p>
          </div>
        )}

        {selectedAccount && (
          <>
            <section className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">Dane ogólne</h2>
                {loading && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    Ładowanie…
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {metrics.map(m => <MetricCard key={m.name} name={m.name} value={m.value} unit={m.unit} />)}
              </div>
              <div className="bg-[#f5f5f5] rounded-[12px] p-6 border border-gray-200">
                <PerformanceChart data={timeSeries} />
              </div>
            </section>

            <hr className="border-gray-200 mb-12" />

            <section className="mb-12">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Analiza targetowań</h2>
              <TargetingAnalysis accountId={selectedAccount.id} dateRange={dateRange} />
            </section>

            <hr className="border-gray-200 mb-12" />

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Reklamy</h2>
              <AdCards accountId={selectedAccount.id} dateRange={dateRange} currency={currency} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
