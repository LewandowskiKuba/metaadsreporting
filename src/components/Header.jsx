import React from 'react';

const PRESETS = [
  { label: '7 dni',  days: 7 },
  { label: '14 dni', days: 14 },
  { label: '30 dni', days: 30 },
  { label: 'Ten miesiąc',      preset: 'this_month' },
  { label: 'Poprzedni miesiąc', preset: 'last_month' },
];

function calcPreset(preset) {
  const today = new Date();
  const pad = n => String(n).padStart(2, '0');
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (preset.days) {
    const from = new Date(today);
    from.setDate(today.getDate() - preset.days);
    return { since: fmt(from), until: fmt(yesterday) };
  }
  if (preset.preset === 'this_month') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { since: fmt(from), until: fmt(yesterday) };
  }
  if (preset.preset === 'last_month') {
    const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const to   = new Date(today.getFullYear(), today.getMonth(), 0);
    return { since: fmt(from), until: fmt(to) };
  }
}

export default function Header({
  accounts, selectedAccount, onSelectAccount,
  dateRange, onDateRangeChange,
}) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2 mr-2 flex-shrink-0">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900 text-sm hidden sm:block">META Ads</span>
        </div>

        {/* Account selector */}
        <select
          value={selectedAccount?.id || ''}
          onChange={e => {
            const acc = accounts.find(a => a.id === e.target.value);
            if (acc) onSelectAccount(acc);
          }}
          className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-0 max-w-[200px] sm:max-w-xs bg-white"
        >
          {accounts.length === 0 && (
            <option value="">Ładowanie kont...</option>
          )}
          {accounts.map(acc => (
            <option key={acc.id} value={acc.id}>{acc.name}</option>
          ))}
        </select>

        {/* Date presets */}
        <div className="hidden lg:flex items-center gap-0.5 ml-1">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => onDateRangeChange(calcPreset(p))}
              className="text-xs px-2.5 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors font-medium whitespace-nowrap"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1 border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white">
            <input
              type="date"
              value={dateRange.since}
              onChange={e => onDateRangeChange({ ...dateRange, since: e.target.value })}
              className="text-xs outline-none w-[110px] cursor-pointer"
            />
            <span className="text-gray-300 text-xs">–</span>
            <input
              type="date"
              value={dateRange.until}
              onChange={e => onDateRangeChange({ ...dateRange, until: e.target.value })}
              className="text-xs outline-none w-[110px] cursor-pointer"
            />
          </div>

        </div>
      </div>
    </header>
  );
}
