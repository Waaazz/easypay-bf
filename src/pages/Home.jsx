import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Minus, Delete } from 'lucide-react';
import WhatsAppMenu from '../components/WhatsAppMenu';
import ClientBottomNav from '../components/ClientBottomNav';

const PLATFORMS = [
  { id: '1xbet', label: '1XBET', color: 'text-white', selectedBg: 'bg-[#1e3a8a]', border: 'border-[#1e3a8a]', dark: true },
  { id: 'melbet', label: 'MELBET', color: 'text-[#f59e0b]', selectedBg: 'bg-white' },
  { id: 'betwinner', label: 'BETWINNER', color: 'text-green-600', selectedBg: 'bg-white' },
  { id: 'canalplus', label: 'CANAL+', color: 'text-white', selectedBg: 'bg-black', border: 'border-black', dark: true, subscription: true },
  { id: 'canalbox', label: 'CANALBOX', color: 'text-[#0072ce]', selectedBg: 'bg-white', subscription: true },
];

const PAD_KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '', '0', 'del'];
const MIN_AMOUNT = 300;

export default function Home() {
  const navigate = useNavigate();
  const [waOpen, setWaOpen] = useState(false);
  // Pas de plateforme pré-sélectionnée par défaut : certains clients tapaient
  // directement leur montant sans remarquer le sélecteur, et se retrouvaient
  // sur 1XBET (l'ancien défaut) sans l'avoir choisi. En forçant un choix actif,
  // impossible de continuer sans avoir sélectionné la bonne plateforme.
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
  // Affiché dès que le client a commencé à taper un montant insuffisant —
  // pas seulement au clic sur un bouton Dépôt/Retrait déjà désactivé.
  const belowMinimum = !isSubscription && amount !== '' && (parseInt(amount) || 0) < MIN_AMOUNT;
  const canProceed = !!platform && (isSubscription || (parseInt(amount) || 0) >= MIN_AMOUNT);

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden" style={{ background: 'linear-gradient(180deg, #69c522 0%, #3a8015 100%)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
        <a
          href="https://apollonplusafrik.net/"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-4 py-2 rounded-full transition-all"
        >
          Apollon+Afrik
        </a>
        <div className="relative">
          <button
            type="button"
            onClick={() => setWaOpen((v) => !v)}
            className="bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-full flex items-center gap-2 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.522 5.849L.057 23.571a.5.5 0 0 0 .612.612l5.722-1.465A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.89 0-3.663-.523-5.176-1.432l-.37-.222-3.846.985.999-3.742-.243-.386A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
            Support
          </button>
          <WhatsAppMenu open={waOpen} onClose={() => setWaOpen(false)} align="right" />
        </div>
      </header>

      {/* Zone défilable : sélecteur de plateforme + pavé numérique. Le header
          et la barre du bas restent toujours visibles ; seul ce bloc scrolle
          si l'écran est trop court pour tout afficher d'un coup. */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col justify-center">
        {/* Platform selector */}
        <div className="mt-2 mb-1 text-center">
          <p className={`text-xs font-medium mb-1.5 ${platform ? 'text-white/90' : 'text-yellow-300 animate-pulse'}`}>
            {platform ? 'Choisir la plateforme' : "👉 Choisissez d'abord votre plateforme"}
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
                  Gérez votre abonnement CANALBOX directement depuis ApollonPay : choisissez votre offre, la durée et payez en un instant.
                </p>
              </div>
            ) : isCanalPlus ? (
              <div className="flex flex-col items-center justify-center text-center py-6 gap-3">
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
                <div className="flex items-center justify-center mb-1">
                  <div className="inline-flex items-baseline gap-2 px-1 pb-1 border-b-2 border-primary-100">
                    <span className="text-3xl font-extrabold text-gray-900 tabular-nums tracking-tight">
                      {amount ? parseInt(amount).toLocaleString('fr-FR') : '0'}
                    </span>
                    <span className="text-sm font-bold text-gray-400">FCFA</span>
                  </div>
                </div>

                {belowMinimum && (
                  <p className="text-red-500 text-xs font-medium text-center mb-2">
                    Le montant minimum est de {MIN_AMOUNT.toLocaleString('fr-FR')} FCFA.
                  </p>
                )}

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

      {/* Bottom action buttons + barre d'onglets : toujours visibles, hors de la zone défilable */}
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
