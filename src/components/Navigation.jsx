import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Calendar, RefreshCw, LogOut, ChevronDown, Users, Building2, Link2 } from 'lucide-react';
import DateRangeModal from './DateRangeModal.jsx';
import { triggerSync, getGoogleAdsOAuthUrl } from '../api/local.js';

function fmtDisplay(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

export function Navigation({ accounts, selectedAccount, onSelectAccount, dateRange, onDateRangeChange, onSync }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const userName  = localStorage.getItem('userName') || 'User';
  const userRole  = localStorage.getItem('userRole') || 'Viewer';
  const isAdmin   = userRole === 'Admin';

  const [modalOpen,    setModalOpen]    = useState(false);
  const [syncing,      setSyncing]      = useState(false);
  const [adminOpen,    setAdminOpen]    = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  const adminRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e) {
      if (adminRef.current && !adminRef.current.contains(e.target)) {
        setAdminOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

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

  const handleConnectGoogle = async () => {
    setOauthLoading(true);
    setAdminOpen(false);
    try {
      const { url } = await getGoogleAdsOAuthUrl();
      window.location.href = url;
    } catch (err) {
      alert(err.message);
      setOauthLoading(false);
    }
  };

  const adminNavItems = [
    {
      label: 'Zarządzanie użytkownikami',
      icon:  <Users className="w-4 h-4" />,
      href:  '/users',
    },
    {
      label: 'Zarządzanie Klientami',
      icon:  <Building2 className="w-4 h-4" />,
      href:  '/clients',
    },
  ];

  const isAdminSection = ['/users', '/clients', '/settings'].includes(location.pathname);

  return (
    <>
      <nav
        className="bg-[#0a0a0f]/90 backdrop-blur-md border-b border-white/10 sticky top-0 z-50"
        style={{ background: 'linear-gradient(135deg, #020381 0%, #0a0a2e 100%)' }}
      >
        <div className="max-w-[1400px] mx-auto px-8">
          <div className="flex items-center justify-between h-16">

            {/* Left — logo (links to dashboard) */}
            <div className="flex items-center gap-8">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center opacity-90 hover:opacity-100 transition-opacity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="110" height="19" viewBox="0 0 239.408 40.61" fill="white">
                  <path d="M2153.152,217.754v2.022a8.079,8.079,0,0,0-6.41-2.624c-5.635,0-10.282,4.947-10.282,11.357s4.646,11.357,10.282,11.357a8.079,8.079,0,0,0,6.41-2.624v2.022h6.453v-21.51Zm-5.119,16a5.25,5.25,0,1,1,5.119-5.248A4.912,4.912,0,0,1,2148.032,233.757Z" transform="translate(-2045.039 -207.86)"/>
                  <path d="M2779.643,217.754v2.194a7.642,7.642,0,0,0-6.281-2.8,10.933,10.933,0,0,0,0,21.854,7.642,7.642,0,0,0,6.281-2.8v1.979c0,3.054-1.85,4.6-4.861,4.6-2.839,0-4.087-1.2-4.9-2.71l-5.507,3.183c1.979,3.528,5.722,5.205,10.2,5.205,5.722,0,11.357-3.054,11.357-10.282V217.754Zm-5.206,15.315a4.995,4.995,0,1,1,5.206-4.99A4.87,4.87,0,0,1,2774.437,233.069Z" transform="translate(-2644.557 -207.86)"/>
                  <path d="M3395.942,231.09h15.272a12.5,12.5,0,0,0,.258-2.581c0-6.5-4.646-11.357-10.927-11.357a11.029,11.029,0,0,0-11.443,11.357c0,6.41,4.56,11.357,11.917,11.357,4.087,0,7.27-1.506,9.378-4.431l-5.162-2.968a5.616,5.616,0,0,1-4.13,1.635C3398.739,234.1,3396.76,233.327,3395.942,231.09Zm-.129-4.818a4.845,4.845,0,0,1,9.249,0Z" transform="translate(-3244.079 -207.86)"/>
                  <path d="M4009.941,217.152c-2.839,0-4.99,1.032-6.152,2.624v-2.022h-6.453v21.51h6.453V227.52c0-3.054,1.635-4.431,4-4.431a3.548,3.548,0,0,1,3.743,3.915v12.26h6.453V226.057C4017.986,220.249,4014.286,217.152,4009.941,217.152Z" transform="translate(-3826.286 -207.86)"/>
                  <path d="M4569.707,239.866a10.981,10.981,0,0,0,9.722-5.549l-5.635-3.226a4.411,4.411,0,0,1-4.173,2.409,4.992,4.992,0,0,1,0-9.98,4.455,4.455,0,0,1,4.173,2.409l5.635-3.269a11.368,11.368,0,1,0-9.722,17.208Z" transform="translate(-4363.252 -207.86)"/>
                  <path d="M5077.894,231.227l-4.044,13.164-4.775-13.164h-7.1l8.561,20.52c-.946,2.624-2.366,3.571-5.377,3.571v6.023c6.022.3,9.851-2.409,12.26-9.249l7.356-20.864Z" transform="translate(-4845.369 -221.333)"/>
                  <path d="M291.29,231.09h15.272a12.5,12.5,0,0,0,.258-2.581c0-6.5-4.646-11.357-10.927-11.357a11.028,11.028,0,0,0-11.443,11.357c0,6.41,4.56,11.357,11.916,11.357,4.087,0,7.27-1.506,9.378-4.431l-5.162-2.968a5.616,5.616,0,0,1-4.13,1.635C294.086,234.1,292.107,233.327,291.29,231.09Zm-.129-4.818a4.846,4.846,0,0,1,9.249,0Z" transform="translate(-272.278 -207.86)"/>
                  <rect width="6.453" height="31.404" transform="translate(38.199)"/>
                  <path d="M1142.852,13.775A3.872,3.872,0,1,0,1138.98,9.9,3.911,3.911,0,0,0,1142.852,13.775Zm-3.226,23.4h6.453V15.668h-6.453Z" transform="translate(-1090.242 -5.774)"/>
                  <path d="M1389.558,102.7V96.5h-4.431V90.48l-6.453,1.936V96.5h-3.442V102.7h3.442v7.614c0,6.023,2.452,8.561,10.884,7.7v-5.851c-2.839.172-4.431,0-4.431-1.85V102.7Z" transform="translate(-1316.385 -86.608)"/>
                  <path d="M1779.062,238.025a11.876,11.876,0,0,1-6.71,1.841c-7.356,0-11.916-4.947-11.916-11.357a11.028,11.028,0,0,1,11.443-11.357,10.788,10.788,0,0,1,6.683,2.222,11.133,11.133,0,0,0-3.365,4.762,4.68,4.68,0,0,0-3.361-1.263,4.44,4.44,0,0,0-4.689,3.4h7.47a12.826,12.826,0,0,0,.067,4.818h-7.409c.817,2.237,2.8,3.011,5.162,3.011a6.144,6.144,0,0,0,2.956-.728A10.975,10.975,0,0,0,1779.062,238.025Z" transform="translate(-1685.105 -207.86)"/>
                  <circle cx="3.716" cy="3.716" r="3.716" transform="translate(0 24.589)"/>
                </svg>
              </button>

              {/* Admin dropdown */}
              {isAdmin && (
                <div className="relative" ref={adminRef}>
                  <button
                    onClick={() => setAdminOpen(v => !v)}
                    className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                      isAdminSection
                        ? 'text-white bg-white/10'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Panel Administratora
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${adminOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {adminOpen && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-[10px] shadow-lg border border-gray-100 py-1 z-50">
                      {adminNavItems.map(item => (
                        <button
                          key={item.href}
                          onClick={() => { navigate(item.href); setAdminOpen(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                            location.pathname === item.href
                              ? 'bg-purple-50 text-purple-700 font-medium'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="text-gray-400">{item.icon}</span>
                          {item.label}
                        </button>
                      ))}

                      <div className="border-t border-gray-100 my-1" />

                      <button
                        onClick={handleConnectGoogle}
                        disabled={oauthLoading}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        <span className="text-gray-400">
                          {oauthLoading
                            ? <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                            : <Link2 className="w-4 h-4" />
                          }
                        </span>
                        Połącz Google Ads (OAuth)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right controls */}
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

              {dateRange && (
                <button
                  onClick={() => setModalOpen(true)}
                  className="flex items-center gap-2 text-white/90 hover:text-white hover:bg-white/5 rounded-lg px-3 py-1.5 text-sm transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  {`${fmtDisplay(dateRange.since)} – ${fmtDisplay(dateRange.until)}`}
                </button>
              )}

              {isAdmin && onSync && (
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
