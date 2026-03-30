import React, { useState } from 'react';
import DateRangeModal from './DateRangeModal.jsx';
import { triggerSync } from '../api/local.js';

function fmtDisplay(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export default function Header({
  user,
  accounts, selectedAccount, onSelectAccount,
  dateRange, onDateRangeChange,
  page, onNavigate,
  onLogout,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [syncing, setSyncing]     = useState(false);

  const handleApply = range => {
    onDateRangeChange(range);
    setModalOpen(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await triggerSync();
      window.location.reload();
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
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

          {/* Nav tabs */}
          <nav className="flex items-center gap-0.5">
            <button
              onClick={() => onNavigate('dashboard')}
              className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                page === 'dashboard' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Dashboard
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => onNavigate('users')}
                className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  page === 'users' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                Użytkownicy
              </button>
            )}
          </nav>

          {/* Account selector (only on dashboard) */}
          {page === 'dashboard' && (
            <>
              <select
                value={selectedAccount?.id || ''}
                onChange={e => {
                  const acc = accounts.find(a => a.id === e.target.value);
                  if (acc) onSelectAccount(acc);
                }}
                className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-0 max-w-xs bg-white"
              >
                {accounts.length === 0 && <option value="">Ładowanie kont...</option>}
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>

              {/* Date range button */}
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors bg-white"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">
                  {fmtDisplay(dateRange.since)} – {fmtDisplay(dateRange.until)}
                </span>
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Sync (admin only) */}
              {user?.role === 'admin' && (
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  title="Synchronizuj dane z Meta API"
                  className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <svg className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {syncing ? 'Sync…' : 'Sync'}
                </button>
              )}
            </>
          )}

          {/* User info + logout */}
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs">
                {user?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="text-xs leading-tight">
                <p className="font-medium text-gray-800">{user?.name}</p>
                <p className="text-gray-400 capitalize">{user?.role}</p>
              </div>
            </div>
            <button onClick={onLogout} className="btn-secondary text-xs px-3 py-1.5">
              Wyloguj
            </button>
          </div>
        </div>
      </header>

      {modalOpen && (
        <DateRangeModal
          dateRange={dateRange}
          onApply={handleApply}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
