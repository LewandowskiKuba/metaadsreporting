import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage.jsx';
import Header from './components/Header.jsx';
import MetricsGrid from './components/MetricsGrid.jsx';
import OverviewChart from './components/OverviewChart.jsx';
import BreakdownSection from './components/BreakdownSection.jsx';
import AdsSection from './components/AdsSection.jsx';
import UsersPage from './pages/UsersPage.jsx';
import { getDbAccounts, getDbAggregate, getDbMetrics, getMe } from './api/local.js';

function defaultDateRange() {
  const today = new Date();
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const from = new Date(today); from.setDate(today.getDate() - 30);
  const to   = new Date(today); to.setDate(today.getDate() - 1);
  return { since: fmt(from), until: fmt(to) };
}

function dbAggToInsight(agg) {
  if (!agg) return null;
  return {
    spend:          String(agg.spend ?? 0),
    impressions:    String(agg.impressions ?? 0),
    reach:          String(agg.reach ?? 0),
    cpm:            String(agg.cpm ?? 0),
    cpc:            String(agg.cpc ?? 0),
    ctr:            String(agg.ctr ?? 0),
    unique_clicks:  String(agg.unique_clicks ?? 0),
    outbound_clicks: agg.outbound_clicks > 0
      ? [{ action_type: 'outbound_click', value: String(agg.outbound_clicks) }]
      : [],
    actions: [
      ...(agg.leads > 0 ? [{ action_type: 'lead', value: String(agg.leads) }] : []),
      ...(agg.calls > 0 ? [{ action_type: 'click_to_call_call_confirm', value: String(agg.calls) }] : []),
    ],
    action_values: agg.purchase_value > 0
      ? [{ action_type: 'purchase', value: String(agg.purchase_value) }]
      : [],
    _cpl:          agg.cpl,
    _cvr:          agg.cvr,
    _cost_per_call: agg.cost_per_call,
    _roas:         agg.roas,
  };
}

export default function App() {
  const [user, setUser]           = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [page, setPage]           = useState('dashboard'); // 'dashboard' | 'users'

  const [accounts, setAccounts]               = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [dateRange, setDateRange]             = useState(defaultDateRange);

  const [insights, setInsights]     = useState(null);
  const [timeSeries, setTimeSeries] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [accountsError, setAccountsError] = useState(null);

  // Validate stored token on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) { setAuthChecked(true); return; }
    getMe()
      .then(res => setUser(res.user))
      .catch(() => localStorage.removeItem('auth_token'))
      .finally(() => setAuthChecked(true));
  }, []);

  // Load accounts after login
  useEffect(() => {
    if (!user) return;
    getDbAccounts()
      .then(res => {
        const accs = res.data || [];
        setAccounts(accs);
        if (accs.length > 0) setSelectedAccount(accs[0]);
      })
      .catch(err => setAccountsError(err.message));
  }, [user]);

  // Load metrics from DB
  useEffect(() => {
    if (!selectedAccount) return;
    setLoading(true);
    setError(null);
    setInsights(null);
    setTimeSeries([]);

    Promise.all([
      getDbAggregate(selectedAccount.id, dateRange),
      getDbMetrics(selectedAccount.id, dateRange),
    ])
      .then(([aggRes, tsRes]) => {
        setInsights(dbAggToInsight(aggRes.data));
        setTimeSeries(tsRes.data || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [selectedAccount, dateRange]);

  const handleLogin = userData => setUser(userData);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
    setAccounts([]);
    setSelectedAccount(null);
    setPage('dashboard');
  };

  // Auth not yet checked
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginPage onLogin={handleLogin} />;

  const currency = selectedAccount?.currency || 'PLN';

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        user={user}
        accounts={accounts}
        selectedAccount={selectedAccount}
        onSelectAccount={setSelectedAccount}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        page={page}
        onNavigate={setPage}
        onLogout={handleLogout}
      />

      {page === 'users' ? (
        <UsersPage />
      ) : (
        <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8 space-y-10">

          {accountsError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <span className="flex-shrink-0 mt-0.5">⚠️</span>
              <div>
                <strong>Błąd ładowania kont:</strong> {accountsError}
                <p className="text-xs mt-1 text-red-500">
                  Sprawdź <code>META_ACCESS_TOKEN</code> w <code>.env</code>.
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
              <p className="text-sm">Ładowanie kont i synchronizacja danych…</p>
              <p className="text-xs mt-1 text-gray-300">Pierwsze uruchomienie pobiera 90 dni historii</p>
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
                      Ładowanie…
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
      )}
    </div>
  );
}
