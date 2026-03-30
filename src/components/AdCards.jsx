import { useState, useEffect } from 'react';
import { getAds } from '../api/meta.js';

function fmt(n) { return Number(n || 0).toLocaleString('pl-PL'); }

export function AdCards({ accountId, dateRange, currency = 'PLN' }) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accountId || !dateRange) return;
    setLoading(true);
    getAds(accountId, dateRange)
      .then(res => setAds(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [accountId, dateRange]);

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Ładowanie reklam…</div>;
  if (!ads.length) return <div className="py-12 text-center text-gray-400 text-sm">Brak reklam w tym okresie</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {ads.map(ad => {
        const insights = ad.insights?.data?.[0];
        const isActive = ad.status === 'ACTIVE';
        const spend = parseFloat(insights?.spend || 0);
        const impressions = parseInt(insights?.impressions || 0);
        const ctr = parseFloat(insights?.ctr || 0);
        const preview = ad.creative?.image_url || ad.creative?.thumbnail_url;
        const isVideo = !!ad.creative?.video_id;

        return (
          <div key={ad.id} className="bg-white rounded-[12px] overflow-hidden shadow-sm hover:shadow-lg transition-shadow">
            <div className="relative h-48 overflow-hidden bg-gray-100">
              {preview ? (
                <img src={preview} alt="kreacja" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white/60 text-sm"
                  style={{ background: 'linear-gradient(135deg, #34e2e4 0%, #4721fb 50%, #ab1dfe 100%)' }}
                >
                  Brak podglądu
                </div>
              )}
              {isVideo && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                    <svg viewBox="0 0 24 24" fill="#4721fb" className="w-5 h-5 ml-0.5">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
              )}
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-gray-900 text-base flex-1 pr-2 leading-tight">{ad.name}</h3>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${
                  isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {isActive ? 'Aktywna' : 'Wstrzymana'}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Wyświetlenia</span>
                  <span className="font-medium text-gray-900">{fmt(impressions)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">CTR</span>
                  <span className="font-medium text-gray-900">{ctr.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Wydatki</span>
                  <span className="font-medium text-gray-900">{spend.toFixed(2)} {currency}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
