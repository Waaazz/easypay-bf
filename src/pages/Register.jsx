import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { User, Eye, EyeOff, ArrowRight, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Register() {
  const { registerClient } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Veuillez entrer votre prénom et nom.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 8) {
      setError('Veuillez entrer un numéro de téléphone valide.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    const result = await registerClient(name, phone, password);
    setLoading(false);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || 'Erreur lors de la création du compte.');
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
        <p className="text-gray-500 text-sm mt-1">Dépôt & Retrait Paris Sportifs</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md card animate-fade-in">
        <h2 className="text-xl font-bold text-white mb-1">Créer un compte</h2>
        <p className="text-gray-400 text-sm mb-6">
          Inscrivez-vous pour retrouver votre historique de transactions.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Prénom & Nom</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Moussa Ouédraogo"
                className="input-field pl-11"
                autoFocus
              />
            </div>
          </div>

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
                placeholder="Au moins 6 caractères"
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

          <div>
            <label className="label">Confirmer le mot de passe</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="input-field"
            />
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
                S'inscrire <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      <p className="text-gray-400 text-sm mt-6 text-center">
        Déjà un compte ?{' '}
        <Link to="/login" state={location.state} className="text-primary-400 font-medium hover:text-primary-300">
          Se connecter
        </Link>
      </p>

      <p className="text-gray-600 text-xs mt-4 text-center">
        En continuant, vous acceptez nos{' '}
        <span className="text-gray-400">Conditions d'utilisation</span>
      </p>
    </div>
  );
}
