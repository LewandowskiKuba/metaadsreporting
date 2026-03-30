import { useState, useEffect } from 'react';
import { getUsers, deleteUser, getDbAccounts } from '../api/local.js';
import { UserModal } from '../components/UserModal.jsx';
import { Navigation } from '../components/Navigation.jsx';
import { Pencil, Trash2, Crown, User } from 'lucide-react';

export function UsersPage() {
  const [users, setUsers] = useState([]);
  const [allAccounts, setAllAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([getUsers(), getDbAccounts()])
      .then(([u, a]) => { setUsers(u.data || []); setAllAccounts(a.data || []); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (user) => {
    if (!confirm(`Usunąć użytkownika ${user.name}?`)) return;
    try { await deleteUser(user.id); load(); }
    catch (err) { alert(err.message); }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation accounts={[]} dateRange={null} onDateRangeChange={() => {}} onSelectAccount={() => {}} />

      <main className="max-w-[1400px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-semibold text-gray-900">Użytkownicy</h1>
          <button
            onClick={() => setModal('add')}
            className="rounded-[8px] text-white font-semibold px-6 py-2.5 text-sm"
            style={{ background: 'linear-gradient(135deg, #34e2e4 0%, #4721fb 50%, #ab1dfe 100%)' }}
          >
            Dodaj użytkownika
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
        )}

        <div className="bg-white rounded-[12px] shadow-sm overflow-hidden border border-gray-100">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                {['Użytkownik', 'Rola', 'Dostęp do kont', 'Status', 'Akcje'].map(h => (
                  <th key={h} className="text-left py-4 px-6 text-sm font-semibold text-gray-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="py-12 text-center text-gray-400 text-sm">Ładowanie…</td></tr>
              )}
              {!loading && users.length === 0 && (
                <tr><td colSpan={5} className="py-12 text-center text-gray-400 text-sm">Brak użytkowników</td></tr>
              )}
              {users.map((user, i) => {
                const isAdmin = user.role === 'admin';
                const accountLabel = isAdmin ? 'Wszystkie' : `${user.accounts?.length || 0} kont`;
                return (
                  <tr key={user.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                          style={{ background: isAdmin
                            ? 'linear-gradient(135deg, #34e2e4 0%, #4721fb 50%, #ab1dfe 100%)'
                            : 'linear-gradient(135deg, #ae228a 0%, #d946a6 100%)' }}
                        >
                          {user.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                        isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-pink-100 text-pink-700'
                      }`}>
                        {isAdmin ? <Crown className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {isAdmin ? 'Admin' : 'Viewer'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-900">{accountLabel}</td>
                    <td className="py-4 px-6">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        user.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {user.active ? 'Aktywny' : 'Nieaktywny'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setModal(user)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(user)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      {modal === 'add' && (
        <UserModal user={null} allAccounts={allAccounts} onSave={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
      )}
      {modal && modal !== 'add' && (
        <UserModal user={modal} allAccounts={allAccounts} onSave={() => { setModal(null); load(); }} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
