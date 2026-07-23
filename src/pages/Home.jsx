import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, Delete, History, Clock } from 'lucide-react';
import { WHATSAPP_NUMBER } from '../utils/constants';
import { useAuth } from '../hooks/useAuth';

const PLATFORMS = [
  { id: '1xbet', label: '1XBET', color: 'text-white', selectedBg: 'bg-[#1e3a8a]', border: 'border-[#1e3a8a]', dark: true },
  { id: 'melbet', label: 'MELBET', color: 'text-[#f59e0b]', selectedBg: 'bg-white' },
  { id: 'betwinner', label: 'BETWINNER', color: 'text-green-600', selectedBg: 'bg-white' },
  { id: 'canalplus', label: 'CANAL+', color: 'text-white', selectedBg: 'bg-black', border: 'border-black', dark: true, subscription: true },
  { id: 'canalbox', label: 'CANALBOX', color: 'text-[#0072ce]', selectedBg: 'bg-white', subscription: true },
];

const PAD_KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '00', '0', 'del'];
const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 25000];

export default function Home() {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const isRegisteredClient = !!user && !user.isAnonymous && userProfile?.role === 'client';
  const [platform, setPlatform] = useState('1xbet');
  const [amount, setAmount] = useState('');

  const selectedPlatform = PLATFORMS.find((p) => p.id === platform);
  const isCanalPlus = platform === 'canalplus';
  const isCanalbox = platform === 'canalbox';

  const handleKey = (key) => {
    if (key === 'del') {
      setAmount((prev) => prev.slice(0, -1));
      return;
    }
    if (amount === '' && key === '00') return;
    if (amount.length >= 7) return;
    setAmount((prev) => prev + key);
  };

  const handleQuickAmount = (value) => {
    setAmount(String(value));
  };

  const handleAction = (type) => {
    if (isCanalbox) return;
    if (isCanalPlus && type === 'deposit') {
      navigate('/canal-plus');
      return;
    }
    const parsed = parseInt(amount) || 0;
    if (parsed < 100) return;
    navigate(`/${type}`, { state: { amount: parsed, platform } });
  };

  const platformLabel = selectedPlatform?.label || '1XBET';
  const isSubscription = !!selectedPlatform?.subscription;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #69c522 0%, #3a8015 100%)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <a
          href="https://apollonplusafrik.net/"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-full transition-all"
        >
          Apollon+Afrik
        </a>
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-2 transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.522 5.849L.057 23.571a.5.5 0 0 0 .612.612l5.722-1.465A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.89 0-3.663-.523-5.176-1.432l-.37-.222-3.846.985.999-3.742-.243-.386A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
          Support
        </a>
        {isRegisteredClient ? (
          <button
            onClick={() => navigate('/history')}
            className="bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-full border border-white/60 flex items-center gap-2 transition-all"
          >
            <History className="w-4 h-4" />
            Historique
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-full border border-white/60 transition-all"
          >
            Connexion
          </button>
        )}
      </header>

      {/* Platform selector */}
      <div className="mt-4 mb-2 text-center">
        <p className="text-white/90 text-sm font-medium mb-3">Choisir la plateforme</p>
        <div className="flex flex-wrap justify-center gap-2 px-4">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all duration-200 ${
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
      <div className="flex-1 mx-4 mb-4">
        <div className="bg-white rounded-3xl shadow-xl shadow-black/10 p-5">
          {isCanalbox ? (
            <div className="flex flex-col items-center justify-center text-center py-10 gap-4">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                <Clock className="w-8 h-8 text-[#0072ce]" />
              </div>
              <div>
                <p className="font-bold text-gray-800 mb-1">CANALBOX — Bientôt disponible</p>
                <p className="text-gray-500 text-sm max-w-xs">
                  La recharge d'abonnement CANALBOX sera bientôt disponible directement depuis ApollonPay. Revenez très vite !
                </p>
              </div>
            </div>
          ) : isCanalPlus ? (
            <div className="flex flex-col items-center justify-center text-center py-10 gap-4">
              <div className="bg-black rounded-2xl px-6 py-3">
                <span className="text-white font-extrabold text-2xl tracking-tight">CANAL<span className="align-super text-sm">+</span></span>
              </div>
              <p className="text-gray-500 text-sm max-w-xs">
                Gérez votre abonnement CANAL+ directement depuis ApollonPay : choisissez votre offre, la durée et payez en un instant.
              </p>
            </div>
          ) : (
            <>
              {/* Amount display */}
              <div className="flex items-center justify-center mb-4">
                <div className="inline-flex items-baseline gap-2 px-1 pb-2 border-b-2 border-primary-100">
                  <span className="text-4xl font-extrabold text-gray-900 tabular-nums tracking-tight">
                    {amount ? parseInt(amount).toLocaleString('fr-FR') : '0'}
                  </span>
                  <span className="text-base font-bold text-gray-400">FCFA</span>
                </div>
              </div>

              {/* Quick amounts */}
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {QUICK_AMOUNTS.map((value) => (
                  <button
                    key={value}
                    onClick={() => handleQuickAmount(value)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-150 active:scale-95 ${
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
              <div className="grid grid-cols-3 gap-3">
                {PAD_KEYS.map((key) => (
                  <button
                    key={key}
                    onClick={() => handleKey(key)}
                    className={`
                      flex items-center justify-center rounded-2xl text-2xl font-bold py-4
                      border transition-all duration-150 active:scale-90 active:shadow-none
                      ${key === 'del'
                        ? 'bg-gradient-to-b from-orange-50 to-orange-100 border-orange-200/70 text-orange-500 shadow-sm shadow-orange-200/60'
                        : 'bg-gradient-to-b from-gray-50 to-gray-100 border-gray-200/80 text-gray-900 shadow-sm shadow-gray-300/40 hover:from-white hover:to-gray-50'
                      }
                    `}
                  >
                    {key === 'del' ? <Delete className="w-6 h-6" /> : key}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom action buttons */}
      <div className="flex gap-0 px-0 pb-0 sticky bottom-0">
        <button
          onClick={() => handleAction('deposit')}
          disabled={isCanalbox}
          className={`flex-1 font-semibold py-5 flex items-center justify-center gap-2 text-base transition-all ${
            isCanalbox
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gold-600 hover:bg-gold-700 active:bg-gold-800 text-white'
          }`}
        >
          {isCanalbox ? <Clock className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {isCanalbox ? 'Bientôt disponible' : isSubscription ? `Payer ${platformLabel}` : `Dépôt ${platformLabel}`}
        </button>
        {!isSubscription && (
          <button
            onClick={() => handleAction('withdrawal')}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-5 flex items-center justify-center gap-2 text-base transition-all active:bg-green-700"
          >
            <Minus className="w-5 h-5" />
            Retrait {platformLabel}
          </button>
        )}
      </div>
    </div>
  );
}
