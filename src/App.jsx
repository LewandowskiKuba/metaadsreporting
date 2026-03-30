import React, { useState, useEffect } from 'react';
import Header from './components/Header.jsx';
import MetricsGrid from './components/MetricsGrid.jsx';
import OverviewChart from './components/OverviewChart.jsx';
import BreakdownSection from './components/BreakdownSection.jsx';
import AdsSection from './components/AdsSection.jsx';
import { getAdAccounts, getInsights, getInsightsTimeSeries } from './api/meta.js';

function defaultDateRange() {
  const today = new Date();
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const from = new Date(today);
  from.setDate(today.getDate() - 7);
  const to = new Date(today);
  to.setDate(today.getDate() - 1);
  return { since: fmt(from), until: fmt(to) };
}

export default function App() {
  const [accounts, setAccounts]               = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [dateRange, setDateRange]             = useState(defaultDateRange);

  const [insights, setInsights]     = useState(null);
  const [timeSeries, setTimeSeries] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [accountsError, setAccountsError] = useState(null);

  // Load ad accounts on mount
  useEffect(() => {
    getAdAccounts()
      .then(res => {
        const active = (res.data || []).filter(a => a.account_status === 1);
        setAccounts(active);
        if (active.length > 0) setSelectedAccount(active[0]);
      })
      .catch(err => setAccountsError(err.message));
  }, []);

  // Load insights whenever account or date range changes
  useEffect(() => {
    if (!selectedAccount) return;
    setLoading(true);
    setError(null);
    setInsights(null);
    setTimeSeries([]);

    Promise.all([
      getInsights(selectedAccount.id, dateRange),
      getInsightsTimeSeries(selectedAccount.id, dateRange),
    ])
      .then(([insRes, tsRes]) => {
        setInsights(insRes.data?.[0] || null);
        setTimeSeries(tsRes.data || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedAccount, dateRange]);

  const currency = selectedAccount?.currency || 'PLN';

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        accounts={accounts}
        selectedAccount={selectedAccount}
        onSelectAccount={setSelectedAccount}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-10">

        {accountsError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
            <span className="mt-0.5 flex-shrink-0">⚠️</span>
            <div>
              <strong>Błąd ładowania kont:</strong> {accountsError}
              <p className="text-xs mt-1 text-red-500">
                Sprawdź <code>META_ACCESS_TOKEN</code> w pliku <code>.env</code> i uruchom ponownie serwer.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            ⚠️ {error}
          </div>
        )}

        {!accountsError && accounts.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p>Ładowanie kont reklamowych...</p>
          </div>
        )}

        {selectedAccount && (
          <>
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Dane ogólne</h2>
                {loading && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    Aktualizacja...
                  </div>
                )}
              </div>
              <MetricsGrid insights={insights} currency={currency} />
              <div className="mt-5">
                <OverviewChart data={timeSeries} />
              </div>
            </section>

            <hr className="border-gray-200" />

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Analiza targetowań</h2>
              <BreakdownSection
                accountId={selectedAccount.id}
                dateRange={dateRange}
                currency={currency}
              />
            </section>

            <hr className="border-gray-200" />

            <section>
              <h2 className="text-lg font-bold text-gray-900 mb-4">Reklamy</h2>
              <AdsSection
                accountId={selectedAccount.id}
                dateRange={dateRange}
                currency={currency}
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
