import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, Delete } from 'lucide-react';

const PLATFORMS = [
  { id: '1xbet', label: '1XBET', color: 'text-white', selectedBg: 'bg-[#1e3a8a]' },
  { id: 'melbet', label: 'MELBET', color: 'text-[#f59e0b]', selectedBg: 'bg-white' },
  { id: 'betwinner', label: 'BETWINNER', color: 'text-green-600', selectedBg: 'bg-white' },
];

const PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'];

export default function Home() {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState('1xbet');
  const [amount, setAmount] = useState('');

  const displayAmount = amount ? parseInt(amount).toLocaleString('fr-FR') + ' FCFA' : '0 FCFA';
  const selectedPlatform = PLATFORMS.find((p) => p.id === platform);

  const handleKey = (key) => {
    if (key === 'del') {
      setAmount((prev) => prev.slice(0, -1));
      return;
    }
    if (amount === '' && key === '00') return;
    if (amount.length >= 7) return;
    setAmount((prev) => prev + key);
  };

  const handleAction = (type) => {
    const parsed = parseInt(amount) || 0;
    if (parsed < 100) return;
    navigate(`/${type}`, { state: { amount: parsed, platform } });
  };

  const platformLabel = selectedPlatform?.label || '1XBET';

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #7ab3f0 0%, #5a93d8 100%)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <button className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-full transition-all">
          Pronostiquer
        </button>
        <button className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-2 transition-all">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.522 5.849L.057 23.571a.5.5 0 0 0 .612.612l5.722-1.465A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.89 0-3.663-.523-5.176-1.432l-.37-.222-3.846.985.999-3.742-.243-.386A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
          Support
        </button>
        <button className="bg-white/20 hover:bg-white/30 text-white text-sm font-semibold px-4 py-2 rounded-full border border-white/60 transition-all">
          Connexion
        </button>
      </header>

      {/* Referral banner */}
      <div className="mx-4 mt-2 bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎁</span>
          <div>
            <p className="text-white text-sm font-semibold flex items-center gap-1">
              <span>↗</span> Gagnez de l'argent avec vos amis !
            </p>
            <p className="text-white/80 text-xs">
              Parrainez vos amis et gagnez de l'argent sur leurs recharge via notre application
            </p>
          </div>
        </div>
        <button className="bg-white text-blue-700 text-xs font-semibold px-3 py-2 rounded-xl whitespace-nowrap hover:bg-blue-50 transition-all">
          Commencer
        </button>
      </div>

      {/* Platform selector */}
      <div className="mt-4 mb-2 text-center">
        <p className="text-white/90 text-sm font-medium mb-3">Choisir la plateforme</p>
        <div className="flex justify-center gap-2 px-4">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
              className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all duration-200 ${
                platform === p.id
                  ? `${p.selectedBg} ${p.id === '1xbet' ? 'border-[#1e3a8a] text-white' : `border-transparent ${p.color}`}`
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
        <div className="bg-white rounded-3xl shadow-lg p-5">
          {/* Amount display */}
          <div className="text-center mb-5">
            <span className="text-3xl font-bold text-gray-800">{displayAmount}</span>
          </div>

          {/* Numpad grid */}
          <div className="grid grid-cols-3 gap-3">
            {PAD_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => handleKey(key)}
                className={`
                  flex items-center justify-center rounded-2xl text-2xl font-semibold transition-all duration-150 active:scale-95
                  ${key === 'del'
                    ? 'bg-orange-100 text-orange-500 py-5'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200 py-5'
                  }
                `}
              >
                {key === 'del' ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
                    <line x1="18" y1="9" x2="12" y2="15"/>
                    <line x1="12" y1="9" x2="18" y2="15"/>
                  </svg>
                ) : key}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom action buttons */}
      <div className="flex gap-0 px-0 pb-0 sticky bottom-0">
        <button
          onClick={() => handleAction('deposit')}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-5 flex items-center justify-center gap-2 text-base transition-all active:bg-blue-800"
        >
          <Plus className="w-5 h-5" />
          Dépôt {platformLabel}
        </button>
        <button
          onClick={() => handleAction('withdrawal')}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-5 flex items-center justify-center gap-2 text-base transition-all active:bg-green-700"
        >
          <Minus className="w-5 h-5" />
          Retrait {platformLabel}
        </button>
      </div>
    </div>
  );
}
