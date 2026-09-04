import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, ChevronRight, X, AlertTriangle, Copy, Check,
  CheckCircle, XCircle, RefreshCw, Smartphone, Tv, User, Phone, MessageCircle,
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useTransactionActions, getActiveNumbers } from '../../hooks/useTransactions';
import { AGENT_NUMBERS, USSD_CODE, WHATSAPP_NUMBERS } from '../../utils/constants';
import WaitingCountdown from '../../components/WaitingCountdown';
import OperatorLogo from '../../components/OperatorLogo';

const RECENT_KEY = 'canalplus_recent_decoders';

// Options communes à plusieurs offres — chaque offre référence un sous-
// ensemble de ces options dans l'ordre où CANAL+ les propose réellement.
const NONE = { id: 'none', name: 'Aucune option', desc: '', price: 0 };
const NETFLIX_BASIC = { id: 'netflix-basic', name: 'NETFLIX BASIC (1E)', price: 3300,
  desc: 'Accédez au catalogue complet de Netflix sur 1 écran à la fois.' };
const NETFLIX_STANDARD = { id: 'netflix-standard', name: 'NETFLIX STANDARD (2E)', price: 6000,
  desc: 'Accédez au catalogue complet de Netflix sur 2 écrans à la fois.' };
const NETFLIX_PREMIUM = { id: 'netflix-premium', name: 'NETFLIX PREMIUM (4E)', price: 7700,
  desc: 'Accédez au catalogue complet de Netflix sur 4 écrans à la fois, en qualité Ultra HD.' };
const CHARME = { id: 'charme', name: 'CHARME', price: 6600,
  desc: 'Toutes les chaînes de CANAL+ : Dorcel, Africa, Penthouse Black TV, Vixen, XXL.' };
const ENGLISH_PLUS_EVASION = { id: 'english-plus-evasion', name: 'ENGLISH PLUS EVASION', price: 5000,
  desc: 'The best contents in English : UEFA Champions League, The Best Of Football, Movies And Series, Telenovelas and much more.' };
const ENGLISH_PLUS_ACCESS_PLUS = { id: 'english-plus-access-plus', name: 'ENGLISH PLUS ACCESS+', price: 2000,
  desc: 'The best contents in English : UEFA Champions League, The Best Of Football, Movies And Series, Telenovelas and much more.' };
const NETFLIX_STANDARD_TTC = { id: 'netflix-standard-ttc', name: 'NETFLIX STANDARD (2E) TTC', price: 6600,
  desc: 'Accédez au catalogue complet de Netflix sur 2 écrans à la fois, inclus dans TOUT CANAL+.' };
const NETFLIX_PREMIUM_TTC = { id: 'netflix-premium-ttc', name: 'NETFLIX PREMIUM (4E) TTC', price: 7700,
  desc: 'Accédez au catalogue complet de Netflix sur 4 écrans à la fois, inclus dans TOUT CANAL+.' };

const OFFERS = [
  { id: 'access', name: 'ACCESS', price: 5500,
    desc: "Plus de 260 chaînes TV et radio. Bénéficiez d'une sélection de chaînes pour toute la famille : séries et divertissement, jeunesse, musique, programmes africains et informations.",
    options: [NONE, NETFLIX_BASIC, NETFLIX_STANDARD, CHARME, NETFLIX_PREMIUM] },
  { id: 'evasion', name: 'EVASION', price: 11000,
    desc: 'Plus de 300 chaînes TV et radio. Découvrez une large variété de contenus pour satisfaire toute la famille : sport, divertissement, jeunesse et toujours toutes les chaînes africaines.',
    options: [NONE, NETFLIX_BASIC, ENGLISH_PLUS_EVASION, NETFLIX_STANDARD, CHARME, NETFLIX_PREMIUM] },
  { id: 'access-plus', name: 'ACCESS+', price: 16500,
    desc: 'Plus de 260 chaînes TV et radio avec encore plus de divertissement, jeunesse, musique, programmes africains et informations.',
    options: [NONE, ENGLISH_PLUS_ACCESS_PLUS, NETFLIX_BASIC, NETFLIX_STANDARD, CHARME, NETFLIX_PREMIUM] },
  { id: 'tout-canal', name: 'TOUT CANAL+', price: 27500,
    desc: "L'intégralité de l'offre CANAL+ : tous les bouquets, toutes les chaînes, tout le divertissement.",
    options: [NONE, NETFLIX_STANDARD_TTC, NETFLIX_PREMIUM_TTC, CHARME] },
];

const DURATIONS = [
  { id: '30j', label: '30 jours', months: 1 },
  { id: '12m', label: '12 mois',  months: 12 },
];

const S = { DECODER: 0, FORM: 1, CHOOSE_OP: 2, CLIENT_PHONE: 3, PAYMENT: 4, WAITING: 5, SUCCESS: 6 };

function formatDecoder(d) {
  return d.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
}

// ─── En-tête commune ─────────────────────────────────────────────────────────
function Header({ title, subtitle, onBack }) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center">
      <button onClick={onBack}
        className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-all">
        <ArrowLeft className="w-5 h-5 text-gray-700" />
      </button>
      <div className="flex-1 text-center">
        <h1 className="text-base font-bold text-[#316516]">{title}</h1>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
      <div className="w-9" />
    </div>
  );
}

function BottomSheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center sm:justify-center">
      <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="px-5 pb-6 space-y-3">{children}</div>
      </div>
    </div>
  );
}

function PickRow({ selected, name, priceLabel, desc, onClick }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
        selected ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
      }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {selected && <Check className="w-4 h-4 text-green-600 flex-shrink-0" />}
          <span className="font-bold text-gray-800">{name}</span>
        </div>
        {priceLabel && <span className="font-bold text-green-600 whitespace-nowrap">{priceLabel}</span>}
      </div>
      {desc && <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">{desc}</p>}
      {selected && <p className="text-green-600 text-xs font-medium mt-1.5">Sélectionné actuellement</p>}
    </button>
  );
}

function CopyBtn({ value }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(value.replace(/\s/g, '')); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition text-xs text-gray-600 font-medium flex-shrink-0">
      {copied ? <><Check className="w-3.5 h-3.5 text-green-500" /> Copié</> : <><Copy className="w-3.5 h-3.5" /> Copier</>}
    </button>
  );
}

// ─── Statut temps réel ──────────────────────────────────────────────────────
function LiveStatus({ txId, onCompleted, onCancelled }) {
  const [status, setStatus] = useState('awaiting_confirmation');
  useEffect(() => {
    if (!txId) return;
    const unsub = onSnapshot(doc(db, 'transactions', txId), snap => {
      if (!snap.exists()) return;
      const s = snap.data().status;
      setStatus(s);
      if (s === 'completed') onCompleted?.();
      if (s === 'cancelled') onCancelled?.();
    });
    return () => unsub();
  }, [txId, onCompleted, onCancelled]);

  const cfg = {
    awaiting_confirmation: { icon: <RefreshCw className="w-4 h-4 animate-spin" />, text: "Paiement en attente de vérification par l'agent...", cls: 'bg-purple-50 border-purple-200 text-purple-700' },
    processing:            { icon: <RefreshCw className="w-4 h-4 animate-spin" />, text: 'Paiement vérifié — recharge du décodeur en cours...', cls: 'bg-blue-50 border-blue-200 text-blue-700' },
    completed:              { icon: <CheckCircle className="w-4 h-4" />, text: 'Terminé ! Votre abonnement CANAL+ a été rechargé.', cls: 'bg-green-50 border-green-200 text-green-700' },
    cancelled:              { icon: <XCircle className="w-4 h-4" />, text: "Transaction annulée par l'agent.", cls: 'bg-red-50 border-red-200 text-red-700' },
  }[status] || { icon: <RefreshCw className="w-4 h-4 animate-spin" />, text: 'En attente...', cls: 'bg-gray-50 border-gray-200 text-gray-600' };

  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${cfg.cls}`}>
      {cfg.icon}{cfg.text}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function CanalPlus() {
  const navigate = useNavigate();
  const { createTransaction, confirmPayment, submitting } = useTransactionActions();

  const [step, setStep] = useState(S.DECODER);
  const [decoder, setDecoder] = useState('');
  const [holderName, setHolderName] = useState('');
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState('');

  const [offer, setOffer] = useState(OFFERS[2]);
  const [duration, setDuration] = useState(DURATIONS[0]);
  const [withOption, setWithOption] = useState(false);
  const [option, setOption] = useState(OFFERS[2].options[0]);
  const [modal, setModal] = useState(null);
  const [showWarning, setShowWarning] = useState(false);

  const [operator, setOperator] = useState(null);
  const [clientPhone, setClientPhone] = useState('');
  const [txId, setTxId] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [showUssdCode, setShowUssdCode] = useState(false);
  const [assignedAgentNumber, setAssignedAgentNumber] = useState('');
  const [selectedAgentConfig, setSelectedAgentConfig] = useState(null);
  const [loadingAgents, setLoadingAgents] = useState(true);
  // Un agent est tiré au hasard par opérateur dès le chargement, puis réutilisé
  // pour l'affichage ET l'assignation (même logique que Deposit.jsx).
  const [pickedAgents, setPickedAgents] = useState({});

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      setRecent(Array.isArray(stored) ? stored : []);
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    getActiveNumbers('canalplus').then(data => {
      setLoadingAgents(false);
      const picks = {};
      AGENT_NUMBERS.forEach(op => {
        const raw = data?.[op.id];
        const list = Array.isArray(raw) ? raw : (raw ? [raw] : []);
        picks[op.id] = list.length > 0 ? list[Math.floor(Math.random() * list.length)] : null;
      });
      setPickedAgents(picks);
    });
  }, []);

  const total = offer.price * duration.months + (withOption ? (option?.price || 0) : 0);

  const handleDecoderNext = () => {
    const digits = decoder.replace(/\D/g, '');
    if (digits.length < 8) { setError('Veuillez entrer un numéro de décodeur valide.'); return; }
    if (!holderName.trim()) { setError('Veuillez entrer le nom du titulaire.'); return; }
    setError('');
    const entry = { decoder: decoder.trim(), name: holderName.trim() };
    const updated = [entry, ...recent.filter(r => r.decoder !== entry.decoder)].slice(0, 3);
    setRecent(updated);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    setStep(S.FORM);
  };

  // ── Étape 0 : Numéro de décodeur ─────────────────────────────────────────
  if (step === S.DECODER) return (
    <div className="min-h-screen bg-gray-50">
      <Header title="CANAL+" subtitle="Gérez votre abonnement avec ApollonPay" onBack={() => navigate('/')} />
      <div className="p-5 space-y-5 max-w-md mx-auto">
        <div className="bg-black rounded-2xl px-6 py-4 flex items-center justify-center">
          <span className="text-white font-extrabold text-3xl tracking-tight">CANAL<span className="align-super text-xl">+</span></span>
        </div>

        <p className="text-center text-gray-500 text-sm">
          Gérez votre abonnement directement depuis ApollonPay
        </p>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">N° décodeur Canal+</p>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2"><Tv className="w-5 h-5 text-gray-400" /></div>
            <input type="text" value={decoder} onChange={e => setDecoder(e.target.value)}
              placeholder="Ex : 24110082865156"
              className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all" />
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Nom du titulaire</p>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2"><User className="w-5 h-5 text-gray-400" /></div>
            <input type="text" value={holderName} onChange={e => setHolderName(e.target.value)}
              placeholder="Prénom et Nom"
              className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all" />
          </div>
        </div>

        {recent.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Décodeurs récents</p>
            <div className="space-y-2">
              {recent.map(r => (
                <button key={r.decoder} onClick={() => { setDecoder(r.decoder); setHolderName(r.name); }}
                  className="w-full flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3.5 hover:bg-gray-50 transition text-left">
                  <Tv className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm">{r.decoder}</p>
                    <p className="text-gray-400 text-xs">{r.name}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-500 text-sm leading-relaxed">
            En cas d'erreur sur le numéro de décodeur, <strong>aucun remboursement</strong> ne pourra être effectué. Vérifiez attentivement.
          </p>
        </div>

        {error && <p className="text-red-500 text-sm px-1">{error}</p>}

        <button onClick={handleDecoderNext}
          className="w-full bg-[#316516] hover:bg-[#2a5314] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all">
          Continuer <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  // ── Étape 1 : Formulaire d'abonnement ────────────────────────────────────
  if (step === S.FORM) return (
    <div className="min-h-screen bg-gray-50">
      <Header title="CANAL+" subtitle="Gérez votre abonnement avec ApollonPay" onBack={() => setStep(S.DECODER)} />
      <div className="p-5 space-y-5 max-w-md mx-auto">

        {/* Décodeur */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-800">{holderName}</p>
            <p className="text-gray-400 text-xs">N° Décodeur : {decoder}</p>
          </div>
          <button onClick={() => setStep(S.DECODER)} className="text-xs text-gray-400 underline">Modifier</button>
        </div>

        {/* Offre */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1 px-1">Votre offre</p>
          <button onClick={() => setModal('offer')}
            className="w-full bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-50 transition">
            <span className="font-bold text-gray-800">{offer.name}</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-green-600">{offer.price.toLocaleString('fr-FR')} CFA</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </div>
          </button>
        </div>

        {/* Durée + option toggle */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1 px-1">Durée</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setModal('duration')}
              className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-50 transition">
              <span className="font-bold text-gray-800">{duration.label}</span>
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
            <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between">
              <span className="font-medium text-gray-700 text-sm">Avec option</span>
              <button onClick={() => setWithOption(v => !v)}
                className={`w-11 h-6 rounded-full transition-all relative ${withOption ? 'bg-green-500' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${withOption ? 'left-5' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Option */}
        {withOption && (
          <button onClick={() => setModal('option')}
            className="w-full bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-50 transition">
            <span className="font-bold text-gray-800">{option?.name || 'Choisir une option'}</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
        )}

        {/* Total */}
        <div className="bg-[#316516] rounded-2xl p-4 flex items-center justify-between">
          <span className="text-primary-100 text-sm font-medium">Total à payer</span>
          <span className="text-yellow-300 font-bold text-lg">{total.toLocaleString('fr-FR')} CFA</span>
        </div>

        <button onClick={() => setShowWarning(true)}
          className="w-full bg-[#316516] hover:bg-[#2a5314] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all">
          Continuer <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Modal offre */}
      {modal === 'offer' && (
        <BottomSheet title="Choisir une offre" onClose={() => setModal(null)}>
          {OFFERS.map(o => (
            <PickRow key={o.id} name={o.name} desc={o.desc} priceLabel={`${o.price.toLocaleString('fr-FR')} CFA`}
              selected={offer.id === o.id}
              onClick={() => {
                setOffer(o);
                // Les options disponibles dépendent de l'offre — on repart sur
                // « Aucune option » pour éviter de garder une option invalide
                // pour la nouvelle offre sélectionnée.
                setOption(o.options[0]);
                setWithOption(false);
                setModal(null);
              }} />
          ))}
        </BottomSheet>
      )}

      {/* Modal durée */}
      {modal === 'duration' && (
        <BottomSheet title="Choisir la durée" onClose={() => setModal(null)}>
          {DURATIONS.map(d => (
            <PickRow key={d.id} name={d.label}
              selected={duration.id === d.id}
              onClick={() => { setDuration(d); setModal(null); }} />
          ))}
        </BottomSheet>
      )}

      {/* Modal option */}
      {modal === 'option' && (
        <BottomSheet title="Choisir une option" onClose={() => setModal(null)}>
          {offer.options.map(o => (
            <PickRow key={o.id} name={o.name} desc={o.desc}
              priceLabel={o.price > 0 ? `+ ${o.price.toLocaleString('fr-FR')} CFA` : null}
              selected={option?.id === o.id}
              onClick={() => { setOption(o); setModal(null); }} />
          ))}
        </BottomSheet>
      )}

      {/* Modal avertissement */}
      {showWarning && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center space-y-4">
            <h2 className="font-bold text-gray-800 text-lg">Attention !</h2>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-red-500 text-sm leading-relaxed">
              Important : votre achat pour le décodeur <strong>{decoder}</strong> - <strong>{holderName}</strong>{' '}
              ne peut pas être remboursé si vous vous trompez de numéro de décodeur.
            </p>
            <button onClick={() => { setShowWarning(false); setStep(S.CHOOSE_OP); }} className="w-full text-green-600 font-semibold py-2">
              Poursuivre l'abonnement
            </button>
            <button onClick={() => { setShowWarning(false); setStep(S.DECODER); }} className="w-full text-gray-500 font-medium py-2">
              Modifier les informations
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Étape 2 : Choix de l'opérateur ───────────────────────────────────────
  if (step === S.CHOOSE_OP) {
    const handleSelectOp = (op) => {
      setOperator(op);
      setSelectedAgentConfig(pickedAgents[op.id] || null);
      setStep(S.CLIENT_PHONE);
    };
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Choisir l'opérateur" onBack={() => setStep(S.FORM)} />
        <div className="p-5 space-y-5 max-w-md mx-auto">
          <div>
            <p className="text-base font-semibold text-gray-800 mb-1">Avec quel mobile money allez-vous payer ?</p>
            <p className="text-sm text-gray-500 mb-4">Choisissez votre opérateur pour voir le numéro de dépôt.</p>
            <div className="space-y-3">
              {AGENT_NUMBERS.map(op => {
                const picked = pickedAgents[op.id];
                const available = !!picked;
                const displayNum = available ? picked.number : null;
                return (
                  <button key={op.id} onClick={() => handleSelectOp(op)}
                    disabled={loadingAgents || !available}
                    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all text-left
                      ${available ? `${op.bg} ${op.border} hover:shadow-sm active:scale-[0.98]` : 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'}`}>
                    <OperatorLogo operator={op} className="h-8" />
                    <div className="flex-1">
                      <p className={`font-bold text-base ${available ? op.text : 'text-gray-400'}`}>{op.name}</p>
                      {loadingAgents
                        ? <p className="text-gray-400 text-sm flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" /> Chargement...
                          </p>
                        : available
                          ? <p className="text-gray-500 text-sm">
                              Numéro de dépôt : <span className="font-semibold text-gray-800">{displayNum}</span>
                            </p>
                          : <p className="text-gray-400 text-sm">Indisponible pour le moment</p>
                      }
                    </div>
                    {available && <ArrowRight className={`w-5 h-5 ml-auto ${op.text}`} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Étape 3 : Numéro de téléphone du client ──────────────────────────────
  if (step === S.CLIENT_PHONE) {
    const handleSubmit = async () => {
      const phone = clientPhone.replace(/\s/g, '');
      if (phone.length < 8) { setError('Veuillez entrer un numéro valide (8 chiffres).'); return; }
      setError('');

      const agentNumber = selectedAgentConfig?.number || '';

      const result = await createTransaction({
        type: 'deposit',
        amount: total,
        platform: 'canalplus',
        accountId: formatDecoder(decoder),
        operator: operator.id,
        clientPhone: phone,
        assignedAgentId: selectedAgentConfig?.agentId || null,
        agentOperatorNumber: agentNumber,
        holderName,
        offerName: offer.name,
        durationLabel: duration.label,
        optionName: withOption ? option.name : 'Aucune option',
      });
      if (result.success) {
        setAssignedAgentNumber(agentNumber);
        setTxId(result.id);
        setStep(S.PAYMENT);
      } else {
        setError(result.error || 'Une erreur est survenue.');
      }
    };
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Votre numéro" onBack={() => setStep(S.CHOOSE_OP)} />
        <div className="p-5 space-y-5 max-w-md mx-auto">

          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${operator.bg} ${operator.border}`}>
            <OperatorLogo operator={operator} className="h-6" />
            <div>
              <p className={`font-semibold text-sm ${operator.text}`}>{operator.name}</p>
              <p className="text-gray-500 text-xs">Opérateur sélectionné</p>
            </div>
            <button onClick={() => setStep(S.CHOOSE_OP)} className="ml-auto text-xs text-gray-400 underline">Changer</button>
          </div>

          <div>
            <p className="text-base font-semibold text-gray-800 mb-1">Votre numéro {operator.name}</p>
            <p className="text-sm text-gray-500 mb-3">
              Ce numéro permettra à l'agent de vérifier votre paiement.
            </p>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2"><Phone className="w-5 h-5 text-gray-400" /></div>
              <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                placeholder="Ex : 07 12 34 56"
                className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
                autoFocus onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm px-1">{error}</p>}

          <button onClick={handleSubmit} disabled={submitting}
            className="w-full bg-[#316516] hover:bg-[#2a5314] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50">
            {submitting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <>Confirmer <ArrowRight className="w-5 h-5" /></>}
          </button>
        </div>
      </div>
    );
  }

  // ── Étape 4 : Page de paiement ───────────────────────────────────────────
  if (step === S.PAYMENT) {
    const displayNumber = assignedAgentNumber;
    const ussd = USSD_CODE[operator.id]?.(assignedAgentNumber, total) || '';
    const ussdTel = `tel:${ussd.replace('#', '%23')}`;
    const waMsg = encodeURIComponent(
      `Bonjour, j'ai effectué un paiement de ${total.toLocaleString('fr-FR')} FCFA pour mon abonnement CANAL+ ${offer.name} (décodeur : ${decoder}). Référence : #${txId.slice(0, 12).toUpperCase()}`
    );

    const handleConfirmPayment = async () => {
      setConfirming(true);
      // Lance directement le composeur USSD pour que le client n'ait plus qu'à
      // saisir son code PIN et valider le transfert sur son téléphone.
      if (ussd) window.location.href = ussdTel;
      const result = await confirmPayment(txId);
      setConfirming(false);
      if (result.success) setStep(S.WAITING);
      else setError(result.error || 'Erreur lors de la confirmation.');
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Confirmation du paiement" onBack={() => navigate('/')} />
        <div className="p-5 space-y-4 max-w-md mx-auto">

          <div className="bg-[#316516] rounded-2xl p-5 text-white">
            <p className="text-primary-200 text-xs mb-1">Montant à envoyer</p>
            <p className="text-3xl font-bold mb-3">{total.toLocaleString('fr-FR')} FCFA</p>
            <div className="bg-white/10 rounded-xl px-4 py-2.5 text-sm">
              Abonnement <span className="font-bold text-yellow-300">{offer.name}</span> — {duration.label}
              {withOption && option.name !== 'Aucune option' && <> + {option.name}</>}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Envoyez <span className="text-[#316516]">{total.toLocaleString('fr-FR')} FCFA</span> à ce numéro :
            </p>
            <div className={`flex items-center justify-between px-4 py-4 rounded-2xl border-2 ${operator.bg} ${operator.border}`}>
              <div className="flex items-center gap-3">
                <OperatorLogo operator={operator} className="h-8" />
                <div>
                  <p className={`text-xs font-semibold ${operator.text}`}>{operator.name}</p>
                  <p className="text-xl font-bold text-gray-800 tracking-wide">{displayNumber}</p>
                </div>
              </div>
              <CopyBtn value={displayNumber} />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-amber-700 text-xs leading-relaxed">
              Envoyez <strong>exactement {total.toLocaleString('fr-FR')} FCFA</strong>.
              Tout autre montant retardera le traitement.
            </p>
          </div>

          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
            <div>
              <p className="text-gray-400 text-xs">Référence</p>
              <p className="font-mono font-bold text-gray-800">#{txId.slice(0, 12).toUpperCase()}</p>
            </div>
            <CopyBtn value={txId.slice(0, 12).toUpperCase()} />
          </div>

          {error && <p className="text-red-500 text-sm px-1">{error}</p>}

          <button onClick={handleConfirmPayment} disabled={confirming}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-base">
            {confirming
              ? <RefreshCw className="w-5 h-5 animate-spin" />
              : <><Smartphone className="w-5 h-5" /> Valider votre achat de {total.toLocaleString('fr-FR')} FCFA</>}
          </button>
          <p className="text-gray-400 text-xs text-center -mt-2">
            Votre composeur téléphonique va s'ouvrir automatiquement pour saisir votre code secret.
          </p>

          {ussd && (
            <div className="text-center">
              <button onClick={() => setShowUssdCode(v => !v)} className="text-gray-400 text-xs underline">
                {showUssdCode ? 'Masquer le code USSD' : "Le composeur ne s'est pas ouvert ? Afficher le code"}
              </button>
              {showUssdCode && (
                <div className="bg-gray-800 rounded-2xl p-4 mt-3 space-y-3 text-left">
                  <p className="text-gray-400 text-xs font-medium">Tapez directement sur votre téléphone :</p>
                  <div className="flex items-center justify-between gap-3">
                    <code className="text-white font-mono text-sm font-bold tracking-wider flex-1">{ussd}</code>
                    <CopyBtn value={ussd} />
                  </div>
                  <a href={ussdTel}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#316516] text-white font-semibold text-sm hover:bg-[#2a5314] transition-all">
                    <Smartphone className="w-4 h-4" />
                    Ouvrir le composeur
                  </a>
                </div>
              )}
            </div>
          )}

          <a href={`https://wa.me/${WHATSAPP_NUMBERS[0]}?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 border-green-500 text-green-600 font-semibold text-sm hover:bg-green-50 transition-all">
            <MessageCircle className="w-5 h-5" />
            Contacter le support WhatsApp
          </a>
        </div>
      </div>
    );
  }

  // ── Étape 5 : Attente de confirmation agent ──────────────────────────────
  if (step === S.WAITING) {
    if (cancelled) return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-sm space-y-5">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Transaction annulée</h2>
          <p className="text-gray-500 text-sm">L'agent a annulé votre demande. Contactez le support si vous avez déjà envoyé le paiement.</p>
          <a href={`https://wa.me/${WHATSAPP_NUMBERS[0]}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 border-green-500 text-green-600 font-semibold text-sm hover:bg-green-50 transition-all">
            <MessageCircle className="w-5 h-5" /> Contacter le support
          </a>
          <button onClick={() => navigate('/')} className="w-full py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition">
            Retour à l'accueil
          </button>
        </div>
      </div>
    );

    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="En attente" onBack={() => navigate('/')} />
        <div className="p-5 space-y-4 max-w-md mx-auto">

          <div className="bg-white rounded-2xl p-6 text-center space-y-4 shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
              <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-lg">Vérification en cours</h2>
              <p className="text-gray-500 text-sm mt-1">
                L'agent vérifie la réception de votre paiement {operator.name}.
              </p>
            </div>
          </div>

          <div className="bg-[#316516] rounded-2xl p-5 text-white space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-primary-200">Montant envoyé</span>
              <span className="font-bold">{total.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-primary-200">Abonnement</span>
              <span className="font-bold">{offer.name} — {duration.label}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-primary-200">Décodeur</span>
              <span className="font-bold">{decoder}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-primary-200">Référence</span>
              <span className="font-mono font-bold">#{txId.slice(0, 12).toUpperCase()}</span>
            </div>
          </div>

          <WaitingCountdown seconds={120} />

          <LiveStatus
            txId={txId}
            onCompleted={() => setStep(S.SUCCESS)}
            onCancelled={() => setCancelled(true)}
          />

          <a href={`https://wa.me/${WHATSAPP_NUMBERS[0]}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 border-green-500 text-green-600 font-semibold text-sm hover:bg-green-50 transition-all">
            <MessageCircle className="w-5 h-5" />
            Contacter le support WhatsApp
          </a>
        </div>
      </div>
    );
  }

  // ── Étape 6 : Succès ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-sm space-y-5">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Abonnement rechargé !</h2>
          <p className="text-gray-500 text-sm">
            Votre offre <span className="font-semibold text-gray-800">{offer.name}</span> a été activée sur le décodeur{' '}
            <span className="font-semibold text-gray-800">{decoder}</span>.
          </p>
        </div>
        <div className="bg-gray-100 rounded-xl px-4 py-3">
          <p className="text-gray-500 text-xs">Montant payé</p>
          <p className="text-gray-800 font-mono font-bold mt-1">{total.toLocaleString('fr-FR')} FCFA</p>
        </div>
        <button onClick={() => navigate('/')}
          className="w-full bg-[#316516] hover:bg-[#2a5314] text-white font-semibold py-4 rounded-2xl transition-all">
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}
