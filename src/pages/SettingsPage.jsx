import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { Navigation } from '../components/Navigation.jsx';
import { CheckCircle, XCircle, ExternalLink, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { getConnections, getGoogleAdsOAuthUrl, disconnectGoogleAds, triggerGadsSync } from '../api/local.js';

function fmtDate(iso) {
  if (!iso) return '–';
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function StatusBadge({ connected }) {
  return connected ? (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1">
      <CheckCircle className="w-3.5 h-3.5" /> Połączone
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-3 py-1">
      <XCircle className="w-3.5 h-3.5" /> Nie połączone
    </span>
  );
}

function PlatformCard({ title, icon, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-[12px] p-6">
      <div className="flex items-center gap-3 mb-5">
        {icon}
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function MetaIcon() {
  return (
    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1877F2, #0a5cbf)' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    </div>
  );
}

function GoogleAdsIcon() {
  return (
    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white border border-gray-200">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    </div>
  );
}

export function SettingsPage() {
  const [searchParams] = useSearchParams();
  const [connections, setConnections] = useState(null);
  const [loading, setLoading]         = useState(true);
  const [connecting, setConnecting]   = useState(false);
  const [syncing, setSyncing]         = useState(false);
  const [message, setMessage]         = useState(null); // { type: 'success'|'error', text }

  const loadConnections = () => {
    setLoading(true);
    getConnections()
      .then(setConnections)
      .catch(() => setConnections(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadConnections();

    // Handle OAuth callback query params
    const connected = searchParams.get('connected');
    const error     = searchParams.get('error');
    const msg       = searchParams.get('msg');

    if (connected === 'google_ads') {
      setMessage({ type: 'success', text: 'Google Ads zostało pomyślnie połączone.' });
    } else if (error === 'google_ads') {
      setMessage({ type: 'error', text: msg ? `Błąd: ${msg}` : 'Nie udało się połączyć z Google Ads.' });
    }
  }, []);

  const handleConnectGoogleAds = async () => {
    setConnecting(true);
    try {
      const { url } = await getGoogleAdsOAuthUrl();
      window.location.href = url;
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
      setConnecting(false);
    }
  };

  const handleDisconnectGoogleAds = async () => {
    if (!confirm('Odłączyć Google Ads? Dane historyczne pozostaną w bazie.')) return;
    try {
      await disconnectGoogleAds();
      setMessage({ type: 'success', text: 'Google Ads zostało odłączone.' });
      loadConnections();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleSyncGoogleAds = async () => {
    setSyncing(true);
    try {
      await triggerGadsSync();
      setMessage({ type: 'success', text: 'Synchronizacja Google Ads zakończona.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSyncing(false);
    }
  };

  const gads      = connections?.google_ads;
  const appReady  = connections?.google_ads_app_configured;

  return (
    <div className="min-h-screen bg-white">
      <Navigation accounts={[]} selectedAccount={null} onSelectAccount={() => {}} dateRange={null} onDateRangeChange={() => {}} />

      <main className="max-w-[900px] mx-auto px-8 py-10">
        <h1 className="text-2xl font-semibold text-gray-900 mb-8">Ustawienia</h1>

        {/* Feedback message */}
        {message && (
          <div className={`flex items-start gap-3 p-4 rounded-[10px] mb-6 text-sm ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.type === 'success'
              ? <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              : <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Połączenia z platformami</h2>

        <div className="flex flex-col gap-4">

          {/* Meta — system token, informational only */}
          <PlatformCard title="Meta Ads" icon={<MetaIcon />}>
            <div className="flex items-center justify-between">
              <div>
                <StatusBadge connected={true} />
                <p className="text-xs text-gray-500 mt-2">
                  Token systemowy — konfigurowany przez <code className="bg-gray-100 px-1 rounded">META_ACCESS_TOKEN</code> w pliku <code className="bg-gray-100 px-1 rounded">.env</code>
                </p>
              </div>
            </div>
          </PlatformCard>

          {/* Google Ads — OAuth per user */}
          <PlatformCard title="Google Ads" icon={<GoogleAdsIcon />}>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                Ładowanie…
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <StatusBadge connected={gads?.connected} />
                    {gads?.connected && (
                      <div className="mt-2 space-y-0.5">
                        <p className="text-xs text-gray-500">Połączono: {fmtDate(gads.connected_at)}</p>
                        {gads.by_user && (
                          <p className="text-xs text-gray-500">Konto: {gads.by_user}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {gads?.connected && (
                      <>
                        <button
                          onClick={handleSyncGoogleAds}
                          disabled={syncing}
                          title="Synchronizuj teraz"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                          Synchronizuj
                        </button>
                        <button
                          onClick={handleDisconnectGoogleAds}
                          title="Odłącz"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Odłącz
                        </button>
                      </>
                    )}
                    <button
                      onClick={handleConnectGoogleAds}
                      disabled={connecting || !appReady}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #4285F4, #0d47a1)' }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      {gads?.connected ? 'Połącz ponownie' : 'Połącz przez OAuth'}
                    </button>
                  </div>
                </div>

                {!appReady && (
                  <div className="flex items-start gap-2 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium mb-1">Brak konfiguracji aplikacji Google Ads</p>
                      <p>Dodaj do <code className="bg-amber-100 px-1 rounded">.env</code>:</p>
                      <pre className="mt-1 font-mono leading-5">{`GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=`}</pre>
                      <p className="mt-1">
                        Zarejestruj callback URL w Google Cloud Console:{' '}
                        <code className="bg-amber-100 px-1 rounded">{window.location.origin.replace('5173', '3002')}/api/auth/google-ads/callback</code>
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </PlatformCard>
        </div>
      </main>
    </div>
  );
}
