import { useState, useEffect } from 'react';
import { getAds } from '../api/meta.js';

const EXCLUDED_PAGE_IDS = ['217248824815577'];
const PAGE_SIZE = 3;

function fmt(n) { return Number(n || 0).toLocaleString('pl-PL'); }

function getConversions(actions) {
  if (!Array.isArray(actions)) return 0;
  const types = ['lead', 'offsite_conversion.fb_pixel_lead', 'onsite_conversion.lead_grouped', 'phone_call'];
  return actions
    .filter(a => types.some(t => a.action_type?.includes(t)))
    .reduce((sum, a) => sum + parseFloat(a.value || 0), 0);
}

function AdCard({ ad, currency }) {
  const insights = ad.insights?.data?.[0];
  const isActive = ad.status === 'ACTIVE';
  const spend = parseFloat(insights?.spend || 0);
  const impressions = parseInt(insights?.impressions || 0);
  const ctr = parseFloat(insights?.ctr || 0);
  const conversions = getConversions(insights?.actions);
  const preview = ad.creative?.image_url || ad.creative?.thumbnail_url;
  const isVideo = !!ad.creative?.video_id;

  return (
    <div className="bg-white rounded-[12px] shadow-sm overflow-hidden flex">
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-40 min-h-[160px] bg-gray-100">
        {preview ? (
          <img src={preview} alt={ad.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center text-white/60 text-xs"
            style={{ background: 'linear-gradient(135deg, #4721fb, #ab1dfe)' }}
          >
            Brak
          </div>
        )}
        {isVideo && (
          <div className="absolute bottom-2 left-2">
            <span className="text-xs font-semibold text-white bg-black/50 rounded px-1.5 py-0.5">vid.</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-gray-900 leading-tight truncate">{ad.name}</h3>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
            isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {isActive ? 'Aktywna' : 'Wstrzymana'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          <div>
            <p className="text-xs text-gray-500">Wyświetlenia</p>
            <p className="text-sm font-semibold text-gray-900">{fmt(impressions)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">CTR</p>
            <p className="text-sm font-semibold text-gray-900">{ctr.toFixed(2)}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Wydatki</p>
            <p className="text-sm font-semibold text-gray-900">{spend.toFixed(2)} {currency}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Konwersje</p>
            <p className="text-sm font-semibold text-gray-900">{conversions > 0 ? fmt(Math.round(conversions)) : '–'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdCards({ accountId, dateRange, currency = 'PLN' }) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(PAGE_SIZE);

  useEffect(() => {
    if (!accountId || !dateRange) return;
    setLoading(true);
    setShown(PAGE_SIZE);
    getAds(accountId, dateRange)
      .then(res => {
        const all = res.data || [];
        const filtered = all.filter(ad => {
          const actorId = ad.creative?.actor_id;
          return !actorId || !EXCLUDED_PAGE_IDS.includes(actorId);
        });
        setAds(filtered);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [accountId, dateRange]);

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Ładowanie reklam…</div>;
  if (!ads.length) return <div className="py-12 text-center text-gray-400 text-sm">Brak reklam w tym okresie</div>;

  return (
    <div>
      <div className="flex flex-col gap-4">
        {ads.slice(0, shown).map(ad => <AdCard key={ad.id} ad={ad} currency={currency} />)}
      </div>
      {shown < ads.length && (
        <button
          onClick={() => setShown(s => s + PAGE_SIZE)}
          className="mt-6 w-full py-2.5 text-sm font-medium text-purple-600 border border-purple-200 rounded-[8px] hover:bg-purple-50 transition-colors"
        >
          Pokaż więcej ({ads.length - shown} pozostałych)
        </button>
      )}
    </div>
  );
}
