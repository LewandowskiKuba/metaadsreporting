import { useState, useEffect } from 'react';
import { getVideoAds } from '../api/meta.js';

const PAGE_SIZE = 3;

function getAction(actions, type) {
  if (!Array.isArray(actions)) return null;
  const found = actions.find(a => a.action_type === type);
  return found ? parseFloat(found.value) : null;
}

function fmtTime(seconds) {
  if (!seconds || isNaN(seconds)) return '–';
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function fmt(n) {
  if (!n || isNaN(n)) return '–';
  return Number(n).toLocaleString('pl-PL');
}

function QuartileBar({ label, value, total }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500 w-8 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #4721fb, #ab1dfe)' }}
        />
      </div>
      <span className="text-gray-700 font-medium w-8 text-right">{pct}%</span>
    </div>
  );
}

function VideoCard({ ad }) {
  const ins = ad.insights?.data?.[0];
  const thumbnail = ad.creative?.thumbnail_url;

  const plays     = getAction(ins?.video_play_actions, 'video_view');
  const avgTime   = getAction(ins?.video_avg_time_watched_actions, 'video_view');
  const p25       = getAction(ins?.video_p25_watched_actions, 'video_view');
  const p50       = getAction(ins?.video_p50_watched_actions, 'video_view');
  const p75       = getAction(ins?.video_p75_watched_actions, 'video_view');
  const p95       = getAction(ins?.video_p95_watched_actions, 'video_view');
  const p100      = getAction(ins?.video_p100_watched_actions, 'video_view');
  const thruplay  = getAction(ins?.video_thruplay_watched_actions, 'video_view');
  const impressions = parseInt(ins?.impressions || 0);

  return (
    <div className="bg-white rounded-[12px] shadow-sm overflow-hidden flex gap-0">
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-40 h-full min-h-[180px] bg-gray-100">
        {thumbnail ? (
          <img src={thumbnail} alt={ad.name} className="w-full h-full object-cover absolute inset-0" />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center text-white/60 text-xs"
            style={{ background: 'linear-gradient(135deg, #4721fb, #ab1dfe)' }}
          >
            Brak
          </div>
        )}
        <div className="absolute bottom-2 left-2">
          <span className="text-xs font-semibold text-white bg-black/50 rounded px-1.5 py-0.5">vid.</span>
        </div>
      </div>

      {/* Metrics */}
      <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
        <div>
          <p className="text-sm font-semibold text-gray-900 truncate mb-3">{ad.name}</p>
          <div className="grid grid-cols-3 gap-x-4 gap-y-2 mb-4">
            <div>
              <p className="text-xs text-gray-500">Odtworzenia</p>
              <p className="text-sm font-semibold text-gray-900">{fmt(plays)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Śr. czas</p>
              <p className="text-sm font-semibold text-gray-900">{fmtTime(avgTime)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">ThruPlay</p>
              <p className="text-sm font-semibold text-gray-900">{fmt(thruplay)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Wyświetlenia</p>
              <p className="text-sm font-semibold text-gray-900">{fmt(impressions)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Wydatki</p>
              <p className="text-sm font-semibold text-gray-900">{ins?.spend ? `${parseFloat(ins.spend).toFixed(2)} PLN` : '–'}</p>
            </div>
          </div>
        </div>

        {/* Quartile bars */}
        {plays > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-gray-400 mb-1">Retencja</p>
            <QuartileBar label="25%" value={p25} total={plays} />
            <QuartileBar label="50%" value={p50} total={plays} />
            <QuartileBar label="75%" value={p75} total={plays} />
            <QuartileBar label="95%" value={p95} total={plays} />
            <QuartileBar label="100%" value={p100} total={plays} />
          </div>
        )}
      </div>
    </div>
  );
}

export function VideoCards({ accountId, dateRange }) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(PAGE_SIZE);

  useEffect(() => {
    if (!accountId || !dateRange) return;
    setLoading(true);
    setShown(PAGE_SIZE);
    getVideoAds(accountId, dateRange)
      .then(res => {
        const videos = (res.data || []).filter(ad => ad.creative?.video_id);
        setAds(videos);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [accountId, dateRange]);

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Ładowanie video…</div>;
  if (!ads.length) return <div className="py-12 text-center text-gray-400 text-sm">Brak reklam video w tym okresie</div>;

  return (
    <div>
      <div className="flex flex-col gap-4">
        {ads.slice(0, shown).map(ad => <VideoCard key={ad.id} ad={ad} />)}
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
