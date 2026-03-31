import { useState, useEffect } from 'react';
import { Navigation } from '../components/Navigation.jsx';
import { MetricCard } from '../components/MetricCard.jsx';
import { PerformanceChart } from '../components/PerformanceChart.jsx';
import { TargetingAnalysis } from '../components/TargetingAnalysis.jsx';
import { AdCards } from '../components/AdCards.jsx';
import { VideoCards } from '../components/VideoCards.jsx';
import { GoogleVideoSection } from '../components/GoogleVideoSection.jsx';
import {
  getDbAccounts, getDbAggregate, getDbMetrics,
  getGadsAccounts, getGadsAggregate, getGadsMetrics,
  triggerGadsSync,
} from '../api/local.js';

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

// ── Platform tab button ───────────────────────────────────────────────────────

function PlatformTab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-gray-900 text-white shadow-sm'
          : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );
}

// ── Meta logo icon ────────────────────────────────────────────────────────────

function MetaIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.5 7.5c.828 0 1.5.672 1.5 1.5s-.672 1.5-1.5 1.5S15 11.828 15 11s.672-1.5 1.5-1.5zM8.5 9C9.88 9 11 10.343 11 12s-1.12 3-2.5 3S6 13.657 6 12s1.12-3 2.5-3zm7 6c-1.38 0-2.5-1.343-2.5-3 0-.35.05-.686.14-1H9.86c.09.314.14.65.14 1 0 1.657-1.12 3-2.5 3S5 14.657 5 13c0-2.21 1.567-4 3.5-4 .59 0 1.14.163 1.62.445C10.54 8.58 11.22 8 12 8s1.46.58 1.88 1.445C14.36 9.163 14.91 9 15.5 9c1.933 0 3.5 1.79 3.5 4 0 1.657-1.12 3-2.5 3z"/>
    </svg>
  );
}

// ── Google icon ───────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

// ── Google Ads dashboard content ──────────────────────────────────────────────

function GoogleAdsDashboard({ account, dateRange, gadsConfigured }) {
  const [agg, setAgg] = useState(null);
  const [timeSeries, setTimeSeries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!account) return;
    setLoading(true);
    setAgg(null);
    setTimeSeries([]);
    Promise.all([
      getGadsAggregate(account.id, dateRange),
      getGadsMetrics(account.id, dateRange),
    ]).then(([aggRes, tsRes]) => {
      setAgg(aggRes.data);
      setTimeSeries(tsRes.data || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [account, dateRange]);

  const currency = account?.currency || 'PLN';

  const metrics = agg ? [
    { name: 'Wydatki',         value: fmtNum(agg.spend, 2),       unit: currency },
    { name: 'Wyświetlenia',    value: fmtNum(agg.impressions),     unit: '' },
    { name: 'Kliknięcia',      value: fmtNum(agg.clicks),          unit: '' },
    { name: 'CTR',             value: fmtNum(agg.ctr, 2),          unit: '%' },
    { name: 'CPC',             value: fmtNum(agg.cpc, 2),          unit: currency },
    ...(agg.conversions > 0
      ? [{ name: 'Konwersje', value: fmtNum(agg.conversions, 0), unit: '' }]
      : []),
    ...(agg.cost_per_conversion != null
      ? [{ name: 'Koszt konwersji', value: fmtNum(agg.cost_per_conversion, 2), unit: currency }]
      : []),
  ] : [];

  return (
    <>
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Dane ogólne</h2>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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

      {agg?.video_views > 0 && (
        <>
          <hr className="border-gray-200 mb-12" />
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Analiza video</h2>
            <GoogleVideoSection agg={agg} currency={currency} />
          </section>
        </>
      )}
    </>
  );
}

// ── Meta dashboard content ────────────────────────────────────────────────────

function MetaDashboard({ account, dateRange }) {
  const [agg, setAgg] = useState(null);
  const [timeSeries, setTimeSeries] = useState([]);
  const [loading, setLoading] = useState(false);

  const currency = account?.currency || 'PLN';

  useEffect(() => {
    if (!account) return;
    setLoading(true);
    setAgg(null);
    setTimeSeries([]);
    Promise.all([
      getDbAggregate(account.id, dateRange),
      getDbMetrics(account.id, dateRange),
    ]).then(([aggRes, tsRes]) => {
      setAgg(aggRes.data);
      setTimeSeries(tsRes.data || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [account, dateRange]);

  const metrics = agg ? [
    { name: 'Wydatki',            value: fmtNum(agg.spend, 2),            unit: currency },
    { name: 'Wyświetlenia',       value: fmtNum(agg.impressions),          unit: '' },
    { name: 'Zasięg',             value: fmtNum(agg.reach),                unit: '' },
    { name: 'Kliknięcia',         value: fmtNum(agg.clicks),               unit: '' },
    { name: 'Unikalne kliknięcia',value: fmtNum(agg.unique_clicks),        unit: '' },
    { name: 'CPM',                value: fmtNum(agg.cpm, 2),               unit: currency },
    { name: 'CPC',                value: fmtNum(agg.cpc, 2),               unit: currency },
    { name: 'CTR',                value: fmtNum(agg.ctr, 2),               unit: '%' },
    ...(agg.leads > 0
      ? [{ name: 'Leady', value: fmtNum(agg.leads), unit: '' }]
      : []),
    ...(agg.calls > 0
      ? [{ name: 'Połączenia', value: fmtNum(agg.calls), unit: '' }]
      : []),
    ...(agg.cpl > 0
      ? [{ name: 'Koszt konwersji (lead)', value: fmtNum(agg.cpl, 2), unit: currency }]
      : []),
    ...(agg.cost_per_call > 0
      ? [{ name: 'Koszt konwersji (połączenie)', value: fmtNum(agg.cost_per_call, 2), unit: currency }]
      : []),
    ...(agg.roas > 0
      ? [{ name: 'ROAS', value: fmtNum(agg.roas, 2), unit: 'x' }]
      : []),
  ] : [];

  return (
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
        <TargetingAnalysis accountId={account.id} dateRange={dateRange} />
      </section>

      <hr className="border-gray-200 mb-12" />

      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Reklamy</h2>
        <AdCards accountId={account.id} dateRange={dateRange} currency={currency} />
      </section>

      <hr className="border-gray-200 mb-12 mt-12" />

      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Analiza video</h2>
        <VideoCards accountId={account.id} dateRange={dateRange} />
      </section>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [platform, setPlatform] = useState('meta'); // 'meta' | 'google'

  const [metaAccounts, setMetaAccounts] = useState([]);
  const [selectedMeta, setSelectedMeta] = useState(null);

  const [gadsAccounts, setGadsAccounts] = useState([]);
  const [gadsConfigured, setGadsConfigured] = useState(false);
  const [selectedGads, setSelectedGads] = useState(null);

  const [dateRange, setDateRange] = useState(defaultDateRange);

  useEffect(() => {
    getDbAccounts().then(res => {
      const accs = res.data || [];
      setMetaAccounts(accs);
      if (accs.length > 0 && !selectedMeta) setSelectedMeta(accs[0]);
    }).catch(console.error);

    getGadsAccounts().then(res => {
      const accs = res.data || [];
      setGadsAccounts(accs);
      setGadsConfigured(!!res.configured);
      if (accs.length > 0 && !selectedGads) setSelectedGads(accs[0]);
    }).catch(console.error);
  }, []);

  const accounts         = platform === 'meta' ? metaAccounts  : gadsAccounts;
  const selectedAccount  = platform === 'meta' ? selectedMeta  : selectedGads;
  const onSelectAccount  = platform === 'meta' ? setSelectedMeta : setSelectedGads;

  const handleSync = () => window.location.reload();

  return (
    <div className="min-h-screen bg-white">
      <Navigation
        accounts={accounts}
        selectedAccount={selectedAccount}
        onSelectAccount={onSelectAccount}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onSync={handleSync}
        platform={platform}
        onSyncGoogle={triggerGadsSync}
      />

      <main className="max-w-[1400px] mx-auto px-8 py-8">
        {/* Platform switcher */}
        <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-10">
          <PlatformTab active={platform === 'meta'} onClick={() => setPlatform('meta')}>
            <MetaIcon /> Meta
          </PlatformTab>
          <PlatformTab active={platform === 'google'} onClick={() => setPlatform('google')}>
            <GoogleIcon /> Google Ads
          </PlatformTab>
        </div>

        {/* Loading / empty state */}
        {!selectedAccount && (
          <div className="text-center py-20 text-gray-400">
            {platform === 'google' && !gadsConfigured ? (
              <div className="max-w-md mx-auto">
                <p className="text-base font-medium text-gray-700 mb-2">Google Ads nie jest skonfigurowany</p>
                <p className="text-sm text-gray-500">
                  Dodaj do pliku <code className="bg-gray-100 px-1 rounded">.env</code> następujące zmienne:
                </p>
                <pre className="mt-4 text-left text-xs bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-700">
{`GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_REFRESH_TOKEN=
GOOGLE_ADS_MANAGER_ID=      # opcjonalnie (MCC)
GOOGLE_ADS_CUSTOMER_IDS=    # opcjonalnie`}
                </pre>
              </div>
            ) : (
              <>
                <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm">Ładowanie kont…</p>
              </>
            )}
          </div>
        )}

        {selectedAccount && platform === 'meta' && (
          <MetaDashboard account={selectedAccount} dateRange={dateRange} />
        )}

        {selectedAccount && platform === 'google' && (
          <GoogleAdsDashboard
            account={selectedAccount}
            dateRange={dateRange}
            gadsConfigured={gadsConfigured}
          />
        )}
      </main>
    </div>
  );
}
