import React, { useState } from 'react';

export default function TokenInput({ onSubmit }) {
  const [value, setValue] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">META Ads Dashboard</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Wprowadź długoterminowy User Access Token z uprawnieniami <code className="bg-gray-100 px-1 rounded">ads_read</code>
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Meta Access Token
            </label>
            <textarea
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="EAABsbCS..."
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-xs font-mono resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
          </div>
          <button
            onClick={() => value.trim() && onSubmit(value.trim())}
            disabled={!value.trim()}
            className="w-full btn-primary py-3 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Zaloguj się
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-5 text-center leading-relaxed">
          Token jest przechowywany tylko lokalnie w przeglądarce (localStorage).
          <br />
          Nie jest wysyłany nigdzie poza Twoim serwerem proxy.
        </p>
      </div>
    </div>
  );
}
