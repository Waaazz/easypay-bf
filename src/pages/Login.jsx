import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, RefreshCw } from 'lucide-react';
import ClientHeader from '../components/ClientHeader';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { loginClient } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 8) {
      setError('Veuillez entrer un numéro de téléphone valide.');
      return;
    }
    if (!password) {
      setError('Veuillez entrer votre mot de passe.');
      return;
    }

    setLoading(true);
    const result = await loginClient(phone, password);
    setLoading(false);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || 'Erreur lors de la connexion.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #69c522 0%, #3a8015 100%)' }}>
      <ClientHeader />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <div className="mb-6 text-center">
          <img src="/icon-192.png" alt="ApollonPay" className="w-14 h-14 rounded-2xl object-cover mx-auto mb-3 shadow-lg shadow-black/20" />
          <h1 className="text-white text-xl font-extrabold">ApollonPay</h1>
          <p className="text-white/70 text-sm mt-1">Dépôt & retrait instantané</p>
        </div>

        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-black/10 p-5">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Connexion</h2>
          <p className="text-gray-500 text-sm mb-6">
            Entrez votre numéro de téléphone et votre mot de passe.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Numéro de téléphone</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-gray-400 text-sm font-medium">🇧🇫 +226</span>
                  <div className="w-px h-5 bg-gray-300" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="70 00 00 00"
                  className="input-field pl-24"
                  maxLength={12}
                  autoFocus
                />
              </div>
            </div>

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
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Se connecter <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-white/80 text-sm mt-6 text-center">
          Pas encore de compte ?{' '}
          <Link to="/register" state={location.state} className="text-white font-semibold hover:underline">
            S'inscrire
          </Link>
        </p>
      </div>
    </div>
  );
}
