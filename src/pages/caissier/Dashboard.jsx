import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, Delete } from 'lucide-react';
import ClientHeader from '../../components/ClientHeader';
import ClientBottomNav from '../../components/ClientBottomNav';
import { useAuth } from '../../hooks/useAuth';

const PLATFORMS = [
  { id: '1xbet', label: '1XBET', color: 'text-white', selectedBg: 'bg-[#1e3a8a]', border: 'border-[#1e3a8a]', dark: true },
  { id: 'melbet', label: 'MELBET', color: 'text-[#f59e0b]', selectedBg: 'bg-white' },
  { id: 'betwinner', label: 'BETWINNER', color: 'text-green-600', selectedBg: 'bg-white' },
  { id: 'canalplus', label: 'CANAL+', color: 'text-white', selectedBg: 'bg-black', border: 'border-black', dark: true, subscription: true },
  { id: 'canalbox', label: 'CANALBOX', color: 'text-[#0072ce]', selectedBg: 'bg-white', subscription: true },
];

const PAD_KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '', '0', 'del'];
const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 25000];
const MIN_AMOUNT = 300;

// Le caissier crée un dépôt/retrait au guichet pour un client physique sans
// compte — la transaction créée est ensuite traitée par un agent exactement
// comme une transaction créée par un client depuis Home.jsx. On réutilise
// donc les mêmes pages Deposit/Withdrawal (choix opérateur, code USSD,
// suivi) plutôt que de dupliquer cette logique ici.
export default function CaissierDashboard() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  // Pas de plateforme pré-sélectionnée par défaut — le caissier doit choisir
  // activement, même logique que Home.jsx.
  const [platform, setPlatform] = useState(null);
  const [amount, setAmount] = useState('');

  const selectedPlatform = PLATFORMS.find((p) => p.id === platform);
  const isCanalPlus = platform === 'canalplus';
  const isCanalbox = platform === 'canalbox';

  const handleKey = (key) => {
    if (!key) return;
    if (key === 'del') {
      setAmount((prev) => prev.slice(0, -1));
      return;
    }
    if (amount.length >= 7) return;
    setAmount((prev) => prev + key);
  };

  const handleQuickAmount = (value) => {
    setAmount(String(value));
  };

  const handleAction = (type) => {
    if (!platform) return;
    if (isCanalPlus && type === 'deposit') {
      navigate('/canal-plus');
      return;
    }
    if (isCanalbox && type === 'deposit') {
      navigate('/canalbox');
      return;
    }
    const parsed = parseInt(amount) || 0;
    if (parsed < MIN_AMOUNT) return;
    navigate(`/${type}`, { state: { amount: parsed, platform } });
  };

  const platformLabel = selectedPlatform?.label || '';
  const isSubscription = !!selectedPlatform?.subscription;
  const canProceed = !!platform && (isSubscription || (parseInt(amount) || 0) >= MIN_AMOUNT);

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden" style={{ background: 'linear-gradient(180deg, #69c522 0%, #3a8015 100%)' }}>
      <ClientHeader />

      <div className="mt-1 mb-1 text-center px-4 flex-shrink-0">
        <p className="text-white/90 text-xs">
          Bonjour <span className="font-semibold">{userProfile?.name || 'Caissier'}</span> — créez une transaction pour un client au guichet.
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col justify-center">
        {/* Platform selector */}
        <div className="mt-1 mb-1 text-center">
          <p className={`text-xs font-medium mb-1.5 ${platform ? 'text-white/90' : 'text-yellow-300 animate-pulse'}`}>
            {platform ? 'Choisir la plateforme' : "👉 Choisissez d'abord la plateforme"}
          </p>
          <div className="flex flex-wrap justify-center gap-1.5 px-4">
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all duration-200 ${
                  platform === p.id
                    ? `${p.selectedBg} ${p.dark ? `${p.border} text-white` : `border-transparent ${p.color}`}`
                    : `bg-white/20 border-white/40 text-white`
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Numpad card */}
        <div className="mx-4 mb-2">
          <div className="bg-white rounded-3xl shadow-xl shadow-black/10 p-3">
            {isCanalbox ? (
              <div className="flex flex-col items-center justify-center text-center py-6 gap-3">
                <div className="bg-black rounded-2xl px-6 py-3 flex items-center gap-1">
                  <span className="text-white font-extrabold text-2xl tracking-tight">CANAL</span>
                  <span className="bg-white text-black font-extrabold text-lg tracking-tight px-1.5 py-0.5 rounded -rotate-6">BOX</span>
                </div>
                <p className="text-gray-500 text-sm max-w-xs">
                  Gérez l'abonnement CANALBOX du client directement depuis ApollonPay : choisissez l'offre, la durée et payez en un instant.
                </p>
              </div>
            ) : isCanalPlus ? (
              <div className="flex flex-col items-center justify-center text-center py-6 gap-3">
                <div className="bg-black rounded-2xl px-6 py-3">
                  <span className="text-white font-extrabold text-2xl tracking-tight">CANAL<span className="align-super text-sm">+</span></span>
                </div>
                <p className="text-gray-500 text-sm max-w-xs">
                  Gérez l'abonnement CANAL+ du client directement depuis ApollonPay : choisissez l'offre, la durée et payez en un instant.
                </p>
              </div>
            ) : (
              <>
                {/* Amount display */}
                <div className="flex items-center justify-center mb-2">
                  <div className="inline-flex items-baseline gap-2 px-1 pb-1 border-b-2 border-primary-100">
                    <span className="text-3xl font-extrabold text-gray-900 tabular-nums tracking-tight">
                      {amount ? parseInt(amount).toLocaleString('fr-FR') : '0'}
                    </span>
                    <span className="text-sm font-bold text-gray-400">FCFA</span>
                  </div>
                </div>

                {/* Quick amounts */}
                <div className="flex flex-wrap justify-center gap-1.5 mb-2">
                  {QUICK_AMOUNTS.map((value) => (
                    <button
                      key={value}
                      onClick={() => handleQuickAmount(value)}
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-all duration-150 active:scale-95 ${
                        amount === String(value)
                          ? 'bg-primary-600 border-primary-600 text-white'
                          : 'bg-primary-50 border-primary-100 text-primary-700 hover:bg-primary-100'
                      }`}
                    >
                      {value.toLocaleString('fr-FR')}
                    </button>
                  ))}
                </div>

                {/* Numpad grid */}
                <div className="grid grid-cols-3 gap-2">
                  {PAD_KEYS.map((key, i) =>
                    key ? (
                      <button
                        key={key}
                        onClick={() => handleKey(key)}
                        className={`
                          flex items-center justify-center rounded-xl text-xl font-bold py-2.5
                          border transition-all duration-150 active:scale-90 active:shadow-none
                          ${key === 'del'
                            ? 'bg-gradient-to-b from-orange-50 to-orange-100 border-orange-200/70 text-orange-500 shadow-sm shadow-orange-200/60'
                            : 'bg-gradient-to-b from-gray-50 to-gray-100 border-gray-200/80 text-gray-900 shadow-sm shadow-gray-300/40 hover:from-white hover:to-gray-50'
                          }
                        `}
                      >
                        {key === 'del' ? <Delete className="w-5 h-5" /> : key}
                      </button>
                    ) : (
                      <div key={`empty-${i}`} aria-hidden="true" />
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom action buttons + barre d'onglets */}
      <div className="flex-shrink-0">
        <div className="flex gap-3 px-4 pb-2 pt-1">
          <button
            onClick={() => handleAction('deposit')}
            disabled={!canProceed}
            className="group flex-1 rounded-2xl bg-gradient-to-b from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-white font-bold py-3 flex items-center justify-center gap-2 text-sm shadow-lg shadow-gold-900/30 ring-1 ring-white/10 transition-all duration-150 active:scale-[0.97] active:shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center group-active:scale-90 transition-transform">
              <Plus className="w-4 h-4" />
            </span>
            {isSubscription ? `Payer ${platformLabel}` : `Dépôt ${platformLabel}`}
          </button>
          {!isSubscription && (
            <button
              onClick={() => handleAction('withdrawal')}
              disabled={!canProceed}
              className="group flex-1 rounded-2xl bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold py-3 flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-900/30 ring-1 ring-white/10 transition-all duration-150 active:scale-[0.97] active:shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center group-active:scale-90 transition-transform">
                <Minus className="w-4 h-4" />
              </span>
              Retrait {platformLabel}
            </button>
          )}
        </div>

        <ClientBottomNav active="transaction" />
      </div>
    </div>
  );
}
