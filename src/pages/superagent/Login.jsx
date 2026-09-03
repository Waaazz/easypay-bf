import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function SuperAgentLogin() {
  const { loginSuperAgent } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || username.trim().length < 3) {
      setError("Veuillez entrer votre nom d'utilisateur.");
      return;
    }
    if (!password || password.length < 6) {
      setError('Mot de passe incorrect.');
      return;
    }

    setLoading(true);
    const result = await loginSuperAgent(username, password);
    setLoading(false);

    if (result.success) {
      navigate('/superagent', { replace: true });
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-900/50 overflow-hidden">
          <img src="/icon-192.png" alt="ApollonPay" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-white text-2xl font-bold">ApollonPay</h1>
        <p className="text-gray-500 text-sm mt-1">Espace Superviseur</p>
      </div>

      <div className="w-full max-w-md card animate-fade-in">
        <h2 className="text-xl font-bold text-white mb-1">Connexion Superviseur</h2>
        <p className="text-gray-400 text-sm mb-6">
          Utilisez les accès fournis par votre administrateur.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nom d'utilisateur */}
          <div>
            <label className="label">Nom d'utilisateur</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ex : karim.s"
              className="input-field"
              autoCapitalize="none"
              autoCorrect="off"
              autoFocus
            />
          </div>

          {/* Mot de passe */}
          <div>
            <label className="label">Mot de passe</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : 'Se connecter'
            }
          </button>
        </form>
      </div>

      <p className="text-gray-600 text-xs mt-6 text-center">
        Accès réservé aux Superviseurs ApollonPay autorisés
      </p>
    </div>
  );
}
