import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, Wallet, User, AlertCircle, ArrowRight,
  RefreshCw, CheckCircle, Copy, Check, Timer,
  MessageCircle, XCircle, Phone, Smartphone,
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useTransactionActions, getActiveNumbers } from '../../hooks/useTransactions';
import {
  AGENT_NUMBERS, USSD_CODE, WHATSAPP_NUMBERS, DEPOSIT_SESSION_MINUTES,
} from '../../utils/constants';
import { mobcashInquiry } from '../../utils/mobcash';
import WaitingCountdown from '../../components/WaitingCountdown';
import OperatorLogo from '../../components/OperatorLogo';

// ─── Étapes ────────────────────────────────────────────────────────────────
const S = { ACCOUNT_ID: 0, CHOOSE_OP: 1, CLIENT_PHONE: 2, PAYMENT: 3, WAITING: 4, SUCCESS: 5 };

// ─── Barre de progression ───────────────────────────────────────────────────
function ProgressBar({ step }) {
  const steps = ['ID', 'Opérateur', 'Téléphone', 'Paiement'];
  const active = step >= S.PAYMENT ? 3 : step;
  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {steps.map((label, i) => (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all
              ${i <= active ? 'bg-[#316516] text-white' : 'bg-gray-200 text-gray-400'}`}>
              {i < active ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-xs ${i <= active ? 'text-[#316516] font-medium' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 w-8 mb-4 rounded transition-all ${i < active ? 'bg-[#316516]' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Timer de session ───────────────────────────────────────────────────────
function SessionTimer() {
  const [seconds, setSeconds] = useState(DEPOSIT_SESSION_MINUTES * 60);
  useEffect(() => {
    if (seconds === 0) return;
    const t = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const expired = seconds === 0;
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border
      ${expired ? 'bg-red-50 border-red-200 text-red-600' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
      <Timer className="w-3.5 h-3.5" />
      {expired ? 'Session expirée' : `Session expire dans : ${m}:${s.toString().padStart(2, '0')}`}
    </div>
  );
}

// ─── Bouton copier ──────────────────────────────────────────────────────────
function CopyBtn({ value, label = 'Copier' }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value.replace(/\s/g, ''));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition text-xs text-gray-600 font-medium">
      {copied ? <><Check className="w-3.5 h-3.5 text-green-500" /> Copié</> : <><Copy className="w-3.5 h-3.5" /> {label}</>}
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
    processing:            { icon: <RefreshCw className="w-4 h-4 animate-spin" />, text: 'Paiement vérifié — crédit en cours...', cls: 'bg-blue-50 border-blue-200 text-blue-700' },
    completed:             { icon: <CheckCircle className="w-4 h-4" />, text: 'Terminé ! Votre compte a été rechargé.', cls: 'bg-green-50 border-green-200 text-green-700' },
    cancelled:             { icon: <XCircle className="w-4 h-4" />, text: 'Transaction annulée par l\'agent.', cls: 'bg-red-50 border-red-200 text-red-700' },
  }[status] || { icon: <RefreshCw className="w-4 h-4 animate-spin" />, text: 'En attente...', cls: 'bg-gray-50 border-gray-200 text-gray-600' };

  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${cfg.cls}`}>
      {cfg.icon}{cfg.text}
    </div>
  );
}

// ─── En-tête commun ─────────────────────────────────────────────────────────
function Header({ title, onBack }) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center">
      <button onClick={onBack}
        className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-all">
        <ArrowLeft className="w-5 h-5 text-gray-700" />
      </button>
      <h1 className="flex-1 text-center text-base font-bold text-[#316516]">{title}</h1>
      <div className="w-9" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function Deposit() {
  const navigate = useNavigate();
  const location = useLocation();
  const { createTransaction, confirmPayment, submitting } = useTransactionActions();

  const { amount = 0, platform = '1xbet' } = location.state || {};
  const platformLabel = platform.toUpperCase();

  const [step, setStep] = useState(S.ACCOUNT_ID);
  const [accountId, setAccountId]     = useState('');
  const [checkingId, setCheckingId]   = useState(false);
  const [verifiedName, setVerifiedName] = useState('');
  const [operator, setOperator]       = useState(null);
  const [clientPhone, setClientPhone] = useState('');
  const [txId, setTxId]               = useState('');
  const [error, setError]             = useState('');
  const [confirming, setConfirming]   = useState(false);
  const [cancelled, setCancelled]     = useState(false);
  const [showUssdCode, setShowUssdCode] = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [assignedAgentNumber, setAssignedAgentNumber] = useState('');
  const [selectedAgentConfig, setSelectedAgentConfig] = useState(null);
  // Un agent est tiré au hasard par opérateur dès le chargement, puis réutilisé
  // pour l'affichage ET l'assignation : le numéro montré au client est donc
  // toujours celui qui sera réellement utilisé pour la transaction.
  const [pickedAgents, setPickedAgents] = useState({});

  useEffect(() => {
    getActiveNumbers().then(data => {
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

  // ── Étape 0 : ID de compte ───────────────────────────────────────────────
  if (step === S.ACCOUNT_ID) {
    const handleAccountIdChange = (value) => {
      setAccountId(value);
      if (verifiedName) setVerifiedName(''); // ID modifié après vérification → re-vérifier
      if (error) setError('');
    };

    const handleNext = async () => {
      if (!accountId.trim()) { setError('Veuillez entrer votre ID de compte.'); return; }

      // Déjà vérifié pour cet ID : on continue directement.
      if (verifiedName) { setStep(S.CHOOSE_OP); return; }

      setError('');
      setCheckingId(true);
      const result = await mobcashInquiry(accountId.trim());
      setCheckingId(false);

      if (result.unavailable) {
        // Vérification indisponible (service hors ligne) : on ne bloque pas
        // le client pour autant, le contrôle habituel se fera côté agent.
        setStep(S.CHOOSE_OP);
        return;
      }
      if (!result.ok || !result.data.valid) {
        setError(result.data?.error === 'Utilisateur introuvable'
          ? `Aucun compte ${platformLabel} ne correspond à cet ID. Vérifiez le numéro.`
          : result.error || result.data?.error || 'ID de compte invalide.');
        return;
      }
      setVerifiedName(result.data.name);
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <Header title={`Recharge ${platformLabel}`} onBack={() => navigate(-1)} />
        <div className="p-5 space-y-5 max-w-md mx-auto">
          <ProgressBar step={S.ACCOUNT_ID} />
          <div className="bg-gray-100 rounded-2xl p-4 text-center">
            <p className="text-gray-500 text-sm mb-2">Montant à déposer</p>
            <div className="flex items-center justify-center gap-3">
              <Wallet className="w-7 h-7 text-[#316516]" />
              <span className="text-3xl font-bold text-[#316516]">{amount.toLocaleString('fr-FR')} FCFA</span>
            </div>
          </div>

          <div>
            <p className="text-base font-semibold text-gray-800 mb-3">Votre ID de compte {platformLabel}</p>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2"><User className="w-5 h-5 text-gray-400" /></div>
              <input type="text" value={accountId} onChange={e => handleAccountIdChange(e.target.value)}
                placeholder="Ex : 198287195"
                className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all"
                autoFocus onKeyDown={e => e.key === 'Enter' && handleNext()} />
            </div>
          </div>

          {verifiedName && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-green-700 text-sm">
                Compte trouvé : <strong>{verifiedName}</strong>. Est-ce bien vous ?
              </p>
            </div>
          )}

          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-500 text-sm leading-relaxed">
              En cas d'erreur sur l'ID de compte {platformLabel}, <strong>aucun remboursement</strong> ne pourra être effectué. Vérifiez attentivement.
            </p>
          </div>

          {error && <p className="text-red-500 text-sm px-1">{error}</p>}

          <button onClick={handleNext} disabled={checkingId}
            className="w-full bg-[#316516] hover:bg-[#2a5314] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50">
            {checkingId
              ? <><RefreshCw className="w-5 h-5 animate-spin" /> Vérification...</>
              : verifiedName
                ? <>Confirmer et continuer <ArrowRight className="w-5 h-5" /></>
                : <>Continuer <ArrowRight className="w-5 h-5" /></>}
          </button>
        </div>
      </div>
    );
  }

  // ── Étape 1 : Choix de l'opérateur ──────────────────────────────────────
  if (step === S.CHOOSE_OP) {
    const handleSelectOp = (op) => {
      setOperator(op);
      setSelectedAgentConfig(pickedAgents[op.id] || null);
      setStep(S.CLIENT_PHONE);
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Choisir l'opérateur" onBack={() => setStep(S.ACCOUNT_ID)} />
        <div className="p-5 space-y-5 max-w-md mx-auto">
          <ProgressBar step={S.CHOOSE_OP} />
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

  // ── Étape 2 : Numéro de téléphone du client ──────────────────────────────
  if (step === S.CLIENT_PHONE) {
    const handleSubmit = async () => {
      const phone = clientPhone.replace(/\s/g, '');
      if (phone.length < 8) { setError('Veuillez entrer un numéro valide (8 chiffres).'); return; }
      setError('');

      // Config chargée au choix de l'opérateur depuis /config/activeNumbers
      const agentNumber = selectedAgentConfig?.number || '';

      const result = await createTransaction({
        type: 'deposit',
        amount,
        platform,
        accountId: accountId.trim(),
        operator: operator.id,
        clientPhone: phone,
        assignedAgentId: selectedAgentConfig?.agentId || null,
        agentOperatorNumber: agentNumber,
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
          <ProgressBar step={S.CLIENT_PHONE} />

          {/* Opérateur sélectionné */}
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

  // ── Étape 3 : Page de paiement ───────────────────────────────────────────
  if (step === S.PAYMENT) {
    // Utilise le numéro spécifique de l'agent assigné (pas le numéro générique des constantes)
    const displayNumber = assignedAgentNumber;
    const ussd = USSD_CODE[operator.id]?.(assignedAgentNumber, amount) || '';
    const ussdTel = `tel:${ussd.replace('#', '%23')}`;
    const waMsg = encodeURIComponent(
      `Bonjour, j'ai effectué un dépôt de ${amount.toLocaleString('fr-FR')} FCFA sur mon compte ${platformLabel} (ID: ${accountId}). Référence : #${txId.slice(0, 12).toUpperCase()}`
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

          {/* Timer */}
          <div className="flex justify-center"><SessionTimer /></div>

          {/* Carte montant */}
          <div className="bg-[#316516] rounded-2xl p-5 text-white">
            <p className="text-primary-200 text-xs mb-1">Montant à envoyer</p>
            <p className="text-3xl font-bold mb-3">{amount.toLocaleString('fr-FR')} FCFA</p>
            <div className="bg-white/10 rounded-xl px-4 py-2.5 text-sm">
              Dépôt sur le compte{' '}
              <span className="font-bold text-yellow-300">{accountId}</span>{' '}
              sur {platformLabel}
            </div>
          </div>

          {/* Numéro de l'agent assigné */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Envoyez <span className="text-[#316516]">{amount.toLocaleString('fr-FR')} FCFA</span> à ce numéro :
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

          {/* Avertissement */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-amber-700 text-xs leading-relaxed">
              Envoyez <strong>exactement {amount.toLocaleString('fr-FR')} FCFA</strong>.
              Tout autre montant retardera le traitement.
            </p>
          </div>

          {/* Référence */}
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
            <div>
              <p className="text-gray-400 text-xs">Référence</p>
              <p className="font-mono font-bold text-gray-800">#{txId.slice(0, 12).toUpperCase()}</p>
            </div>
            <CopyBtn value={txId.slice(0, 12).toUpperCase()} />
          </div>

          {error && <p className="text-red-500 text-sm px-1">{error}</p>}

          {/* Bouton confirmation */}
          <button onClick={handleConfirmPayment} disabled={confirming}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-base">
            {confirming
              ? <RefreshCw className="w-5 h-5 animate-spin" />
              : <><Smartphone className="w-5 h-5" /> Valider votre dépôt de {amount.toLocaleString('fr-FR')} FCFA</>}
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

          {/* WhatsApp */}
          <a href={`https://wa.me/${WHATSAPP_NUMBERS[0]}?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 border-green-500 text-green-600 font-semibold text-sm hover:bg-green-50 transition-all">
            <MessageCircle className="w-5 h-5" />
            Contacter le support WhatsApp
          </a>
        </div>
      </div>
    );
  }

  // ── Étape 4 : Attente de confirmation agent ──────────────────────────────
  if (step === S.WAITING) {
    if (cancelled) {
      return (
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
    }

    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="En attente" onBack={() => navigate('/')} />
        <div className="p-5 space-y-4 max-w-md mx-auto">

          {/* Carte statut */}
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

          {/* Récapitulatif */}
          <div className="bg-[#316516] rounded-2xl p-5 text-white space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-primary-200">Montant envoyé</span>
              <span className="font-bold">{amount.toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-primary-200">Opérateur</span>
              <span className="font-bold flex items-center gap-1.5"><OperatorLogo operator={operator} className="h-4" boxed /> {operator.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-primary-200">Compte {platformLabel}</span>
              <span className="font-bold">{accountId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-primary-200">Référence</span>
              <span className="font-mono font-bold">#{txId.slice(0, 12).toUpperCase()}</span>
            </div>
          </div>

          {/* Décompte visuel */}
          <WaitingCountdown seconds={120} />

          {/* Statut temps réel */}
          <LiveStatus
            txId={txId}
            onCompleted={() => setStep(S.SUCCESS)}
            onCancelled={() => setCancelled(true)}
          />

          {/* WhatsApp */}
          <a href={`https://wa.me/${WHATSAPP_NUMBERS[0]}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 border-green-500 text-green-600 font-semibold text-sm hover:bg-green-50 transition-all">
            <MessageCircle className="w-5 h-5" />
            Contacter le support WhatsApp
          </a>
        </div>
      </div>
    );
  }

  // ── Étape 5 : Succès ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-sm space-y-5">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Recharge confirmée !</h2>
          <p className="text-gray-500 text-sm">
            Votre compte <span className="font-semibold text-gray-800">{platformLabel}</span> a été
            rechargé de <span className="font-semibold text-gray-800">{amount.toLocaleString('fr-FR')} FCFA</span>.
          </p>
        </div>
        <div className="bg-gray-100 rounded-xl px-4 py-3">
          <p className="text-gray-500 text-xs">Référence</p>
          <p className="text-gray-800 font-mono font-bold mt-1">#{txId.slice(0, 12).toUpperCase()}</p>
        </div>
        <button onClick={() => navigate('/')}
          className="w-full bg-[#316516] hover:bg-[#2a5314] text-white font-semibold py-4 rounded-2xl transition-all">
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}
