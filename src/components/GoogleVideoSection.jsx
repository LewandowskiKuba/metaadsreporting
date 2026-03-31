function fmtNum(n, decimals = 0) {
  if (n == null || n === 0) return '–';
  return Number(n).toLocaleString('pl-PL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function QuartileBar({ label, value }) {
  const pct = Math.round(Math.min(value || 0, 100));
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-gray-500 w-10 flex-shrink-0 font-medium">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #4285F4, #34A853)' }}
        />
      </div>
      <span className="text-gray-800 font-semibold w-12 text-right">{pct}%</span>
    </div>
  );
}

export function GoogleVideoSection({ agg, currency }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Summary cards */}
      <div className="bg-[#f5f5f5] rounded-[12px] p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Wyniki video</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Wyświetlenia video</p>
            <p className="text-2xl font-semibold text-gray-900">{fmtNum(agg.video_views)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Koszt konwersji</p>
            <p className="text-2xl font-semibold text-gray-900">
              {agg.cost_per_conversion != null
                ? `${fmtNum(agg.cost_per_conversion, 2)} ${currency}`
                : '–'}
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          * Śr. czas oglądania nie jest dostępny w Google Ads API — dostępny w YouTube Analytics.
        </p>
      </div>

      {/* Quartile retention bars */}
      <div className="bg-[#f5f5f5] rounded-[12px] p-6 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Retencja (ćwiartki)</h3>
        {(agg.video_p25 > 0 || agg.video_p50 > 0) ? (
          <div className="space-y-3">
            <QuartileBar label="25%"  value={agg.video_p25}  />
            <QuartileBar label="50%"  value={agg.video_p50}  />
            <QuartileBar label="75%"  value={agg.video_p75}  />
            <QuartileBar label="100%" value={agg.video_p100} />
          </div>
        ) : (
          <p className="text-sm text-gray-400">Brak danych o retencji w wybranym okresie.</p>
        )}
      </div>
    </div>
  );
}
