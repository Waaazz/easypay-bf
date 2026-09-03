import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, RefreshCw } from 'lucide-react';
import ClientHeader from '../../components/ClientHeader';
import { useAuth } from '../../hooks/useAuth';

export default function CaissierLogin() {
  const { loginCaissier } = useAuth();
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
    const result = await loginCaissier(username, password);
    setLoading(false);

    if (result.success) {
      navigate('/caissier', { replace: true });
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #69c522 0%, #3a8015 100%)' }}>
      <ClientHeader />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <div className="mb-6 text-center">
          <img src="/icon-192.png" alt="ApollonPay" className="w-14 h-14 rounded-2xl object-cover mx-auto mb-3 shadow-lg shadow-black/20" />
          <h1 className="text-white text-xl font-extrabold">ApollonPay</h1>
          <p className="text-white/70 text-sm mt-1">Espace Caissier</p>
        </div>

        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-black/10 p-5">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Connexion Caissier</h2>
          <p className="text-gray-500 text-sm mb-6">
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
                placeholder="ex : aicha.o"
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
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading
                ? <RefreshCw className="w-4 h-4 animate-spin" />
                : <>Se connecter <ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>
        </div>

        <p className="text-white/60 text-xs mt-6 text-center">
          Accès réservé aux caissiers ApollonPay
        </p>
      </div>
    </div>
  );
}
