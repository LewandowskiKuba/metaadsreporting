import { useState, useEffect } from 'react';
import { Navigation } from '../components/Navigation.jsx';
import { getClients, createClient, updateClient, deleteClient, getDbAccounts, getGadsAccounts } from '../api/local.js';
import { Plus, Pencil, Trash2, Building2, ChevronDown, ChevronUp, X, Check } from 'lucide-react';

// ── Account badge ─────────────────────────────────────────────────────────────

function PlatformDot({ platform }) {
  return platform === 'meta'
    ? <span className="inline-block w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" title="Meta" />
    : <span className="inline-block w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Google Ads" />;
}

// ── Account multi-select inside modal ─────────────────────────────────────────

function AccountSelect({ platform, label, allAccounts, selected, onChange }) {
  const toggle = (id) => {
    const next = selected.includes(id)
      ? selected.filter(x => x !== id)
      : [...selected, id];
    onChange(next);
  };

  if (!allAccounts.length) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
        {allAccounts.map(acc => {
          const checked = selected.includes(acc.id);
          return (
            <label
              key={acc.id}
              className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors ${checked ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(acc.id)}
                className="accent-blue-600 w-4 h-4 flex-shrink-0"
              />
              <span className="text-sm text-gray-700 truncate">{acc.name}</span>
              <span className="text-xs text-gray-400 font-mono ml-auto flex-shrink-0">{acc.id}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

// ── Client modal (add / edit) ─────────────────────────────────────────────────

function ClientModal({ client, metaAccounts, gadsAccounts, onSave, onClose }) {
  const [name,         setName]         = useState(client?.name || '');
  const [metaSel,      setMetaSel]      = useState(
    client?.accounts?.filter(a => a.platform === 'meta').map(a => a.account_id) || []
  );
  const [gadsSel,      setGadsSel]      = useState(
    client?.accounts?.filter(a => a.platform === 'google_ads').map(a => a.account_id) || []
  );
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState(null);

  const handleSave = async () => {
    if (!name.trim()) { setError('Podaj nazwę klienta'); return; }
    setSaving(true);
    setError(null);
    const accounts = [
      ...metaSel.map(id => ({ platform: 'meta',       account_id: id })),
      ...gadsSel.map(id => ({ platform: 'google_ads', account_id: id })),
    ];
    try {
      if (client) {
        await updateClient(client.id, { name, accounts });
      } else {
        await createClient({ name, accounts });
      }
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-[16px] shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {client ? 'Edytuj klienta' : 'Nowy klient'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa klienta</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="np. Klient XYZ"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          <AccountSelect
            platform="meta"
            label="Konta Meta Ads"
            allAccounts={metaAccounts}
            selected={metaSel}
            onChange={setMetaSel}
          />

          <AccountSelect
            platform="google_ads"
            label="Konta Google Ads"
            allAccounts={gadsAccounts}
            selected={gadsSel}
            onChange={setGadsSel}
          />

          {!metaAccounts.length && !gadsAccounts.length && (
            <p className="text-sm text-gray-400">Brak dostępnych kont reklamowych.</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Anuluj
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #34e2e4 0%, #4721fb 50%, #ab1dfe 100%)' }}
          >
            {saving
              ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <Check className="w-3.5 h-3.5" />}
            Zapisz
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Client row ────────────────────────────────────────────────────────────────

function ClientRow({ client, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const metaAccs = client.accounts?.filter(a => a.platform === 'meta')       || [];
  const gadsAccs = client.accounts?.filter(a => a.platform === 'google_ads') || [];
  const total    = client.accounts?.length || 0;

  return (
    <div className="bg-white border border-gray-200 rounded-[12px] overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #34e2e4 0%, #4721fb 50%, #ab1dfe 100%)' }}
        >
          {client.name[0].toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{client.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {total === 0 ? 'Brak kont' : `${total} kont${total === 1 ? 'o' : total < 5 ? 'a' : ''}`}
            {metaAccs.length > 0 && ` · ${metaAccs.length} Meta`}
            {gadsAccs.length > 0 && ` · ${gadsAccs.length} Google Ads`}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {total > 0 && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
          <button
            onClick={() => onEdit(client)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(client)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && total > 0 && (
        <div className="border-t border-gray-100 px-5 py-3 bg-gray-50 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {client.accounts.map(a => (
            <div key={`${a.platform}-${a.account_id}`} className="flex items-center gap-2 text-xs text-gray-600">
              <PlatformDot platform={a.platform} />
              <span className="font-mono text-gray-500">{a.account_id}</span>
              <span className="text-gray-400">{a.platform === 'meta' ? 'Meta' : 'Google Ads'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ClientsPage() {
  const [clients,      setClients]      = useState([]);
  const [metaAccounts, setMetaAccounts] = useState([]);
  const [gadsAccounts, setGadsAccounts] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [modal,        setModal]        = useState(null); // null | 'add' | client object
  const [error,        setError]        = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([getClients(), getDbAccounts(), getGadsAccounts()])
      .then(([c, m, g]) => {
        setClients(c.data || []);
        setMetaAccounts(m.data || []);
        setGadsAccounts(g.data || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (client) => {
    if (!confirm(`Usunąć klienta "${client.name}"?`)) return;
    try { await deleteClient(client.id); load(); }
    catch (err) { alert(err.message); }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation accounts={[]} dateRange={null} onDateRangeChange={() => {}} onSelectAccount={() => {}} />

      <main className="max-w-[900px] mx-auto px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-gray-400" />
            <h1 className="text-2xl font-semibold text-gray-900">Zarządzanie Klientami</h1>
          </div>
          <button
            onClick={() => setModal('add')}
            className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-white rounded-[8px]"
            style={{ background: 'linear-gradient(135deg, #34e2e4 0%, #4721fb 50%, #ab1dfe 100%)' }}
          >
            <Plus className="w-4 h-4" />
            Nowy klient
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
        )}

        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Ładowanie…
          </div>
        ) : clients.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Brak klientów</p>
            <p className="text-gray-400 text-sm mt-1">Kliknij „Nowy klient", aby dodać pierwszego.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {clients.map(c => (
              <ClientRow
                key={c.id}
                client={c}
                onEdit={setModal}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {(modal === 'add' || (modal && modal !== 'add')) && (
        <ClientModal
          client={modal === 'add' ? null : modal}
          metaAccounts={metaAccounts}
          gadsAccounts={gadsAccounts}
          onSave={() => { setModal(null); load(); }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
