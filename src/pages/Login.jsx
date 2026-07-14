import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, RefreshCw } from 'lucide-react';
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
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-900/50 overflow-hidden">
          <img src="/icon.svg" alt="ApollonPay" className="w-full h-full object-cover" />
        </div>
        <h1 className="text-white text-2xl font-bold">ApollonPay</h1>
        <p className="text-gray-500 text-sm mt-1">Dépôt & Retrait Paris Sportifs</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md card animate-fade-in">
        <h2 className="text-xl font-bold text-white mb-1">Connexion</h2>
        <p className="text-gray-400 text-sm mb-6">
          Entrez votre numéro de téléphone et votre mot de passe.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Numéro de téléphone</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-gray-400 text-sm font-medium">🇧🇫 +226</span>
                <div className="w-px h-5 bg-gray-700" />
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

      <p className="text-gray-400 text-sm mt-6 text-center">
        Pas encore de compte ?{' '}
        <Link to="/register" state={location.state} className="text-primary-400 font-medium hover:text-primary-300">
          S'inscrire
        </Link>
      </p>
    </div>
  );
}
