import React, { useState, useEffect } from 'react';
import { getUsers, deleteUser, getDbAccounts } from '../api/local.js';
import UserModal from '../components/UserModal.jsx';

const ROLE_BADGE = {
  admin:  { label: 'Admin',  cls: 'bg-purple-100 text-purple-700' },
  viewer: { label: 'Viewer', cls: 'bg-blue-100 text-blue-700' },
};

export default function UsersPage() {
  const [users, setUsers]           = useState([]);
  const [allAccounts, setAllAccounts] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null); // null | 'add' | user object
  const [error, setError]           = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([getUsers(), getDbAccounts()])
      .then(([u, a]) => {
        setUsers(u.data || []);
        setAllAccounts(a.data || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async user => {
    if (!confirm(`Usunąć użytkownika ${user.name}?`)) return;
    try {
      await deleteUser(user.id);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSaved = () => {
    setModal(null);
    load();
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Użytkownicy</h1>
          <p className="text-sm text-gray-500 mt-0.5">Zarządzaj dostępem do dashboardu</p>
        </div>
        <button onClick={() => setModal('add')} className="btn-primary flex items-center gap-2">
          <span className="text-lg leading-none">+</span> Dodaj użytkownika
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Użytkownik</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Rola</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Dostęp do kont</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400 text-sm">
                  Ładowanie…
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="py-12 text-center text-gray-400 text-sm">
                  Brak użytkowników
                </td>
              </tr>
            )}
            {users.map((user, i) => {
              const badge = ROLE_BADGE[user.role] || ROLE_BADGE.viewer;
              const accountLabel = user.role === 'admin'
                ? 'Wszystkie'
                : user.accounts?.length > 0
                  ? `${user.accounts.length} ${user.accounts.length === 1 ? 'konto' : user.accounts.length < 5 ? 'konta' : 'kont'}`
                  : <span className="text-gray-400">Brak dostępu</span>;

              return (
                <tr key={user.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${i === users.length - 1 ? 'border-b-0' : ''}`}>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
                        {user.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${badge.cls}`}>
                      {user.role === 'admin' ? '👑 ' : '👤 '}{badge.label}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-700">
                    {accountLabel}
                  </td>
                  <td className="py-4 px-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${user.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {user.active ? 'Aktywny' : 'Nieaktywny'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setModal(user)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edytuj"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Usuń"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {modal === 'add' && (
        <UserModal
          user={null}
          allAccounts={allAccounts}
          onSave={handleSaved}
          onClose={() => setModal(null)}
        />
      )}
      {modal && modal !== 'add' && (
        <UserModal
          user={modal}
          allAccounts={allAccounts}
          onSave={handleSaved}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
