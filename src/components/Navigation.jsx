import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Calendar, RefreshCw, ChevronDown, LogOut } from 'lucide-react';
import DateRangeModal from './DateRangeModal.jsx';
import { triggerSync } from '../api/local.js';

function fmtDisplay(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export function Navigation({ accounts, selectedAccount, onSelectAccount, dateRange, onDateRangeChange, onSync }) {
  const navigate = useNavigate();
  const location = useLocation();
  const userName = localStorage.getItem('userName') || 'User';
  const userRole = localStorage.getItem('userRole') || 'Viewer';
  const isAdmin = userRole === 'Admin';
  const [modalOpen, setModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('userName');
    localStorage.removeItem('userRole');
    navigate('/');
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await triggerSync();
      if (onSync) onSync();
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <nav className="bg-[#0a0a0f]/90 backdrop-blur-md border-b border-white/10 sticky top-0 z-50"
        style={{ background: 'linear-gradient(135deg, #020381 0%, #0a0a2e 100%)' }}>
        <div className="max-w-[1400px] mx-auto px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left */}
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #34e2e4 0%, #4721fb 50%, #ab1dfe 100%)' }}
                >
                  <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </div>
                <span className="text-white font-semibold text-lg">META Ads</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => navigate('/dashboard')}
                  className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                    location.pathname === '/dashboard' ? 'text-white bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Dashboard
                </button>
                {isAdmin && (
                  <button
                    onClick={() => navigate('/users')}
                    className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                      location.pathname === '/users' ? 'text-white bg-white/10' : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Użytkownicy
                  </button>
                )}
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              {accounts?.length > 0 && (
                <select
                  value={selectedAccount?.id || ''}
                  onChange={e => {
                    const acc = accounts.find(a => a.id === e.target.value);
                    if (acc) onSelectAccount(acc);
                  }}
                  className="text-sm bg-white/10 text-white border border-white/20 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-white/30"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id} className="text-gray-900 bg-white">{acc.name}</option>
                  ))}
                </select>
              )}

              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-2 text-white/90 hover:text-white hover:bg-white/5 rounded-lg px-3 py-1.5 text-sm transition-colors"
              >
                <Calendar className="w-4 h-4" />
                {dateRange ? `${fmtDisplay(dateRange.since)} – ${fmtDisplay(dateRange.until)}` : ''}
              </button>

              {isAdmin && (
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="text-white/90 hover:text-white hover:bg-white/5 rounded-lg p-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                </button>
              )}

              <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                  style={{ background: 'linear-gradient(135deg, #34e2e4 0%, #4721fb 50%, #ab1dfe 100%)' }}
                >
                  {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <div className="text-sm hidden sm:block">
                  <div className="text-white font-medium">{userName}</div>
                  <div className="text-white/60 text-xs">{userRole}</div>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-white/90 hover:text-white hover:bg-white/5 rounded-lg p-1.5 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {modalOpen && (
        <DateRangeModal
          dateRange={dateRange}
          onApply={range => { onDateRangeChange(range); setModalOpen(false); }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
