import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, RefreshCw, CheckCircle, LogOut } from 'lucide-react';
import ClientHeader from '../../components/ClientHeader';
import ClientBottomNav from '../../components/ClientBottomNav';
import { useAuth } from '../../hooks/useAuth';

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
    <div>
      <p className="text-gray-400 text-xs font-bold uppercase tracking-wide mb-2 px-1">Changer mon mot de passe</p>
      <div className="bg-gray-50 rounded-2xl p-4">
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
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <p className="text-green-700 text-sm">Mot de passe mis à jour.</p>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full text-sm">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Mettre à jour'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CaissierAccount() {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/caissier/login');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #69c522 0%, #3a8015 100%)' }}>
      <ClientHeader />

      <div className="flex-1 mx-4 mb-4 bg-white rounded-3xl shadow-xl shadow-black/10 p-5 space-y-5 overflow-y-auto">
        <div className="border border-gray-200 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-gray-900">{userProfile?.name || 'Caissier'}</p>
            <p className="text-gray-500 text-sm">{userProfile?.phone}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-red-500 hover:text-red-600 text-sm font-semibold flex-shrink-0"
          >
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>

        <ChangePasswordCard />
      </div>

      <ClientBottomNav active="compte" />
    </div>
  );
}
