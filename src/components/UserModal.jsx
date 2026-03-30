import { useState, useEffect } from 'react';
import { createUser, updateUser } from '../api/local.js';
import { Crown, User } from 'lucide-react';

export function UserModal({ user, allAccounts, onSave, onClose }) {
  const isEdit = !!user;

  const [name, setName]         = useState(user?.name || '');
  const [email, setEmail]       = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState(user?.role || 'viewer');
  const [accounts, setAccounts] = useState(user?.accounts || []);
  const [active, setActive]     = useState(user?.active ?? 1);
  const [error, setError]       = useState(null);
  const [saving, setSaving]     = useState(false);

  const toggleAccount = id => {
    setAccounts(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setError(null);
    if (!name || !email) return setError('Imię i email są wymagane');
    if (!isEdit && !password) return setError('Hasło jest wymagane dla nowego użytkownika');

    setSaving(true);
    try {
      const payload = {
        name,
        email,
        role,
        active,
        accounts: role === 'admin' ? [] : accounts,
        ...(password ? { password } : {}),
      };

      if (isEdit) {
        await updateUser(user.id, payload);
      } else {
        await createUser({ ...payload, password });
      }
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-[12px] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEdit ? 'Edytuj użytkownika' : 'Dodaj użytkownika'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Imię i nazwisko</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-[8px] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Jan Kowalski"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-[8px] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="jan@przyklad.pl"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hasło {isEdit && <span className="text-gray-400 font-normal text-xs">(zostaw puste, aby nie zmieniać)</span>}
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-[8px] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="••••••••"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Rola</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setRole('admin')}
                className={`p-4 rounded-[12px] border-2 transition-all text-left ${role === 'admin' ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <Crown className={`w-8 h-8 mx-auto mb-2 ${role === 'admin' ? 'text-purple-600' : 'text-gray-400'}`} />
                <div className="font-semibold text-gray-900 text-center">Admin</div>
                <div className="text-xs text-gray-500 mt-1 text-center">Pełny dostęp</div>
              </button>
              <button
                onClick={() => setRole('viewer')}
                className={`p-4 rounded-[12px] border-2 transition-all text-left ${role === 'viewer' ? 'border-pink-500 bg-pink-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <User className={`w-8 h-8 mx-auto mb-2 ${role === 'viewer' ? 'text-pink-600' : 'text-gray-400'}`} />
                <div className="font-semibold text-gray-900 text-center">Viewer</div>
                <div className="text-xs text-gray-500 mt-1 text-center">Tylko odczyt</div>
              </button>
            </div>
          </div>

          {/* Active toggle (edit only) */}
          {isEdit && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActive(active ? 0 : 1)}
                className={`relative w-10 h-5 rounded-full transition-colors ${active ? 'bg-purple-600' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${active ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-sm text-gray-700">Konto aktywne</span>
            </div>
          )}

          {/* Account access (viewers only) */}
          {role === 'viewer' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">Dostęp do kont</label>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => setAccounts(allAccounts.map(a => a.id))} className="text-purple-600 hover:underline">Wszystkie</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => setAccounts([])} className="text-gray-500 hover:underline">Żadne</button>
                </div>
              </div>
              <div className="border border-gray-200 rounded-[12px] overflow-hidden max-h-52 overflow-y-auto">
                {allAccounts.length === 0 && <p className="text-sm text-gray-400 p-4 text-center">Brak kont w bazie</p>}
                {allAccounts.map((acc, i) => (
                  <label key={acc.id} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                    <input
                      type="checkbox"
                      checked={accounts.includes(acc.id)}
                      onChange={() => toggleAccount(acc.id)}
                      className="w-4 h-4 rounded border-gray-300 accent-purple-600"
                    />
                    <span className="text-sm text-gray-800">{acc.name}</span>
                    <span className="text-xs text-gray-400 ml-auto">{acc.id}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Zaznaczono: {accounts.length} z {allAccounts.length}</p>
            </div>
          )}

          {role === 'admin' && (
            <p className="text-sm text-gray-500 bg-purple-50 rounded-lg px-4 py-3">
              Admin ma automatyczny dostęp do wszystkich kont.
            </p>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2.5 rounded-lg">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-[8px] hover:bg-gray-100 transition-colors">
            Anuluj
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold text-white rounded-[8px] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #34e2e4 0%, #4721fb 50%, #ab1dfe 100%)' }}
          >
            {saving ? 'Zapisywanie…' : isEdit ? 'Zapisz zmiany' : 'Utwórz użytkownika'}
          </button>
        </div>
      </div>
    </div>
  );
}
