import React, { useState } from 'react';
import { RefreshCw, User, Check } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// Affiche le nom d'utilisateur de connexion d'un caissier/SuperAgent, ou
// permet à l'admin d'en assigner un si le compte n'en a pas encore. Ne
// touche jamais l'auth Firebase existante du compte — voir
// AuthContext.assignUsername.
export default function UsernameAssign({ uid, role, username }) {
  const { assignUsername } = useAuth();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (username && !editing) {
    return (
      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 text-xs">
        <User className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600 flex-shrink-0" />
        {username}
      </div>
    );
  }

  const handleSave = async () => {
    if (value.trim().length < 3) { setError('Minimum 3 caractères.'); return; }
    setLoading(true);
    setError('');
    const result = await assignUsername(uid, role, value);
    setLoading(false);
    if (result.success) {
      setEditing(false);
      setValue('');
    } else {
      setError(result.error);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="nom.utilisateur"
          className="flex-1 min-w-0 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-primary-400"
        />
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex-shrink-0 p-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
        >
          {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        </button>
      </div>
      {error && <p className="text-red-500 dark:text-red-400 text-[11px] mt-1">{error}</p>}
    </div>
  );
}
