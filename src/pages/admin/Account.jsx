import React, { useState } from 'react';
import { Eye, EyeOff, RefreshCw, CheckCircle, Mail, Lock } from 'lucide-react';
import Layout from '../../components/Layout';
import { useAuth } from '../../hooks/useAuth';

function ChangeEmailCard() {
  const { userProfile, changeOwnEmail, refreshProfile } = useAuth();
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!newEmail.trim() || !newEmail.includes('@')) { setError('Entrez une adresse email valide.'); return; }
    if (!currentPassword) { setError('Entrez votre mot de passe actuel.'); return; }

    setLoading(true);
    const result = await changeOwnEmail(currentPassword, newEmail.trim());
    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setNewEmail('');
      setCurrentPassword('');
      await refreshProfile();
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Mail className="w-5 h-5 text-primary-400" />
        </div>
        <div>
          <h3 className="text-gray-900 dark:text-white font-semibold">Changer mon email</h3>
          <p className="text-gray-500 text-xs">Email actuel : {userProfile?.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="label">Nouvel email</label>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => { setNewEmail(e.target.value); setSuccess(false); }}
            placeholder="nouvel-email@exemple.com"
            className="input-field"
          />
        </div>

        <div>
          <label className="label">Mot de passe actuel</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setSuccess(false); }}
              placeholder="••••••••"
              className="input-field pr-12"
            />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0" />
            <p className="text-green-600 dark:text-green-400 text-sm">Email mis à jour.</p>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full text-sm">
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Mettre à jour'}
        </button>
      </form>
    </div>
  );
}

function ChangePasswordCard() {
  const { changeOwnPassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!currentPassword) { setError('Entrez votre mot de passe actuel.'); return; }
    if (newPassword.length < 6) { setError('Le nouveau mot de passe doit contenir au moins 6 caractères.'); return; }

    setLoading(true);
    const result = await changeOwnPassword(currentPassword, newPassword);
    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Lock className="w-5 h-5 text-primary-400" />
        </div>
        <h3 className="text-gray-900 dark:text-white font-semibold">Changer mon mot de passe</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="label">Mot de passe actuel</label>
          <div className="relative">
            <input
              type={showCurrent ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setSuccess(false); }}
              placeholder="••••••••"
              className="input-field pr-12"
            />
            <button type="button" onClick={() => setShowCurrent(v => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
              {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="label">Nouveau mot de passe</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setSuccess(false); }}
              placeholder="Minimum 6 caractères"
              className="input-field pr-12"
            />
            <button type="button" onClick={() => setShowNew(v => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0" />
            <p className="text-green-600 dark:text-green-400 text-sm">Mot de passe mis à jour.</p>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full text-sm">
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Mettre à jour'}
        </button>
      </form>
    </div>
  );
}

export default function AdminAccount() {
  return (
    <Layout>
      <div className="space-y-5 animate-fade-in max-w-lg">
        <div>
          <h1 className="page-title">Mon compte</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gérer ton email et ton mot de passe de connexion</p>
        </div>

        <ChangeEmailCard />
        <ChangePasswordCard />
      </div>
    </Layout>
  );
}
