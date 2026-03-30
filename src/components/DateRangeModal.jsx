import React, { useState, useEffect, useRef } from 'react';

// ── helpers ───────────────────────────────────────────────────────────────────

const pad = n => String(n).padStart(2, '0');
const fmtISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtDisplay = iso => { const [y, m, d] = iso.split('-'); return `${d}.${m}.${y}`; };

function addMonths(date, n) {
  const d = new Date(date);
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  return d;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return fmtISO(d);
}

function isoToLocal(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const PRESETS = [
  { label: 'Wczoraj',           since: () => daysAgo(1), until: () => daysAgo(1) },
  { label: 'Ostatnie 7 dni',    since: () => daysAgo(7), until: () => daysAgo(1) },
  { label: 'Ostatnie 14 dni',   since: () => daysAgo(14), until: () => daysAgo(1) },
  { label: 'Ostatnie 30 dni',   since: () => daysAgo(30), until: () => daysAgo(1) },
  { label: 'Ostatnie 90 dni',   since: () => daysAgo(90), until: () => daysAgo(1) },
  {
    label: 'Ten miesiąc',
    since: () => { const d = new Date(); return fmtISO(new Date(d.getFullYear(), d.getMonth(), 1)); },
    until: () => daysAgo(1),
  },
  {
    label: 'Poprzedni miesiąc',
    since: () => { const d = new Date(); return fmtISO(new Date(d.getFullYear(), d.getMonth() - 1, 1)); },
    until: () => { const d = new Date(); return fmtISO(new Date(d.getFullYear(), d.getMonth(), 0)); },
  },
];

const WEEKDAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];
const MONTHS_PL = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];

// ── Calendar ──────────────────────────────────────────────────────────────────

function CalendarMonth({ year, month, rangeStart, rangeEnd, hoverDate, onDayClick, onDayHover }) {
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const offset = (firstDow + 6) % 7; // shift to Mon start
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const today = fmtISO(new Date());

  return (
    <div className="w-64">
      <div className="text-center font-semibold text-gray-800 mb-3">
        {MONTHS_PL[month]} {year}
      </div>
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map(wd => (
          <div key={wd} className="text-center text-xs text-gray-400 font-medium py-1">{wd}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const iso = `${year}-${pad(month + 1)}-${pad(d)}`;
          const isStart = iso === rangeStart;
          const isEnd   = iso === (rangeEnd || hoverDate);
          const effectiveEnd = rangeEnd || hoverDate;
          const inRange = rangeStart && effectiveEnd && iso > rangeStart && iso < effectiveEnd;
          const isToday = iso === today;
          const isFuture = iso > today;

          let cls = 'relative flex items-center justify-center h-8 text-sm cursor-pointer select-none transition-colors ';

          if (isFuture) {
            cls += 'text-gray-300 cursor-default ';
          } else if (isStart || isEnd) {
            cls += 'bg-blue-600 text-white font-semibold rounded-lg z-10 ';
          } else if (inRange) {
            cls += 'bg-blue-100 text-blue-800 ';
          } else if (isToday) {
            cls += 'text-blue-600 font-semibold hover:bg-gray-100 rounded-lg ';
          } else {
            cls += 'text-gray-700 hover:bg-gray-100 rounded-lg ';
          }

          // Range connectors
          let bgBar = null;
          if ((isStart && effectiveEnd && iso < effectiveEnd) || (isEnd && rangeStart && iso > rangeStart)) {
            const side = isStart ? 'left-1/2 right-0' : 'left-0 right-1/2';
            bgBar = <div className={`absolute top-0 bottom-0 ${side} bg-blue-100`} />;
          }

          return (
            <div
              key={iso}
              className={cls}
              onClick={() => !isFuture && onDayClick(iso)}
              onMouseEnter={() => !isFuture && onDayHover(iso)}
            >
              {bgBar}
              <span className="relative z-10">{d}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function DateRangeModal({ dateRange, onApply, onClose }) {
  const [rangeStart, setRangeStart] = useState(dateRange.since);
  const [rangeEnd, setRangeEnd]     = useState(dateRange.until);
  const [selecting, setSelecting]   = useState(null); // 'start' | null
  const [hoverDate, setHoverDate]   = useState(null);

  // Show two months: previous and current
  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const prevMonth = addMonths(new Date(viewYear, viewMonth), -1);

  const overlayRef = useRef();

  const handleDayClick = iso => {
    if (!selecting) {
      // Start new selection
      setRangeStart(iso);
      setRangeEnd(null);
      setSelecting('end');
    } else {
      // Complete selection
      if (iso < rangeStart) {
        setRangeEnd(rangeStart);
        setRangeStart(iso);
      } else {
        setRangeEnd(iso);
      }
      setSelecting(null);
      setHoverDate(null);
    }
  };

  const applyPreset = preset => {
    const since = preset.since();
    const until = preset.until();
    setRangeStart(since);
    setRangeEnd(until);
    setSelecting(null);
    setHoverDate(null);
  };

  const handleApply = () => {
    if (rangeStart && rangeEnd) {
      onApply({ since: rangeStart, until: rangeEnd });
    }
  };

  const shiftMonths = n => {
    const d = addMonths(new Date(viewYear, viewMonth), n);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const calProps = {
    rangeStart,
    rangeEnd,
    hoverDate: selecting ? hoverDate : null,
    onDayClick: handleDayClick,
    onDayHover: setHoverDate,
  };

  const canApply = rangeStart && rangeEnd && !selecting;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={e => e.target === overlayRef.current && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Wybierz zakres dat</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none">✕</button>
        </div>

        {/* Presets */}
        <div className="px-6 pt-4 pb-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2.5">Szybki wybór</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => {
              const since = p.since();
              const until = p.until();
              const active = rangeStart === since && rangeEnd === until;
              return (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p)}
                  className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 px-6 py-2">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400">lub ustaw własny zakres</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* Calendar */}
        <div className="px-6 pb-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => shiftMonths(-1)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
              ←
            </button>
            <div className="flex gap-16">
              <span className="w-64 text-center text-sm text-gray-500">
                {MONTHS_PL[prevMonth.getMonth()]} {prevMonth.getFullYear()}
              </span>
              <span className="w-64 text-center text-sm text-gray-500">
                {MONTHS_PL[viewMonth]} {viewYear}
              </span>
            </div>
            <button onClick={() => shiftMonths(1)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
              →
            </button>
          </div>

          <div className="flex gap-8 justify-center">
            <CalendarMonth
              year={prevMonth.getFullYear()}
              month={prevMonth.getMonth()}
              {...calProps}
            />
            <CalendarMonth
              year={viewYear}
              month={viewMonth}
              {...calProps}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
          <div className="text-sm text-gray-600">
            {rangeStart && (
              <>
                <span className="font-medium">{fmtDisplay(rangeStart)}</span>
                {' '}→{' '}
                <span className="font-medium">{rangeEnd ? fmtDisplay(rangeEnd) : (selecting ? '…' : '')}</span>
              </>
            )}
            {!rangeStart && <span className="text-gray-400">Kliknij dzień startowy</span>}
            {selecting && <span className="ml-2 text-blue-500 text-xs">wybierz dzień końcowy</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary text-sm">Anuluj</button>
            <button
              onClick={handleApply}
              disabled={!canApply}
              className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Zastosuj
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
