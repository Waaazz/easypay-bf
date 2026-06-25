import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Wallet, User, Phone, Key,
  RefreshCw, CheckCircle, XCircle, AlertTriangle,
  AlertCircle, Info, MessageCircle, Copy, Check,
} from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useTransactionActions } from '../../hooks/useTransactions';
import { FEES, WHATSAPP_NUMBER } from '../../utils/constants';

// ─── Étapes ────────────────────────────────────────────────────────────────
const S = { ACCOUNT_ID: 0, ORANGE_INFO: 1, WITHDRAW_CODE: 2, SUMMARY: 3, WAITING: 4, SUCCESS: 5 };

// ─── Calcul frais ───────────────────────────────────────────────────────────
const calcFee  = (amount) => Math.ceil(amount * FEES.withdrawal);
const calcNet  = (amount) => amount - calcFee(amount);

// ─── Barre de progression ───────────────────────────────────────────────────
function ProgressBar({ step }) {
  const steps = ['ID compte', 'Orange Money', 'Code retrait', 'Confirmation'];
  const active = Math.min(step, steps.length - 1);
  return (
    <div className="flex items-center justify-center gap-1.5 py-3">
      {steps.map((label, i) => (
        <React.Fragment key={label}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all
              ${i <= active ? 'bg-[#1e3a8a] text-white' : 'bg-gray-200 text-gray-400'}`}>
              {i < active ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-[10px] text-center leading-tight ${i <= active ? 'text-[#1e3a8a] font-medium' : 'text-gray-400'}`}>
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 w-5 mb-4 rounded transition-all ${i < active ? 'bg-[#1e3a8a]' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── En-tête ────────────────────────────────────────────────────────────────
function Header({ title, onBack }) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center">
      <button onClick={onBack}
        className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-all">
        <ArrowLeft className="w-5 h-5 text-gray-700" />
      </button>
      <h1 className="flex-1 text-center text-base font-bold text-[#1e3a8a]">{title}</h1>
      <div className="w-9" />
    </div>
  );
}

// ─── Carte montant ──────────────────────────────────────────────────────────
function AmountCard({ amount }) {
  return (
    <div className="bg-gray-100 rounded-2xl p-4 text-center">
      <p className="text-gray-500 text-sm mb-2">Montant à retirer</p>
      <div className="flex items-center justify-center gap-3">
        <Wallet className="w-7 h-7 text-[#1e3a8a]" />
        <span className="text-3xl font-bold text-[#1e3a8a]">{amount.toLocaleString('fr-FR')} FCFA</span>
      </div>
    </div>
  );
}

// ─── Résumé frais ───────────────────────────────────────────────────────────
function FeeBox({ amount }) {
  const fee = calcFee(amount);
  const net = calcNet(amount);
  return (
    <div className="bg-[#1e3a8a] rounded-2xl p-4 space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-blue-200">Montant demandé</span>
        <span className="text-white font-semibold">{amount.toLocaleString('fr-FR')} FCFA</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-blue-200">Frais ({FEES.withdrawal * 100}%)</span>
        <span className="text-red-300 font-semibold">- {fee.toLocaleString('fr-FR')} FCFA</span>
      </div>
      <div className="border-t border-white/20 pt-2 flex justify-between">
        <span className="text-blue-100 font-semibold">Vous recevrez</span>
        <span className="text-yellow-300 font-bold text-lg">{net.toLocaleString('fr-FR')} FCFA</span>
      </div>
    </div>
  );
}

// ─── Champ input ────────────────────────────────────────────────────────────
function Field({ label, icon: Icon, value, onChange, placeholder, type = 'text', hint }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2">
          <Icon className="w-5 h-5 text-gray-400" />
        </div>
        <input type={type} value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all" />
      </div>
    </div>
  );
}

// ─── Ligne de récap ─────────────────────────────────────────────────────────
function SummaryRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? 'text-[#1e3a8a]' : 'text-gray-800'}`}>{value}</span>
    </div>
  );
}

// ─── Copier ─────────────────────────────────────────────────────────────────
function CopyBtn({ value }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition text-xs text-gray-600 font-medium">
      {copied ? <><Check className="w-3.5 h-3.5 text-green-500" /> Copié</> : <><Copy className="w-3.5 h-3.5" /> Copier</>}
    </button>
  );
}

// ─── Statut temps réel ──────────────────────────────────────────────────────
function LiveStatus({ txId, onCompleted, onCancelled }) {
  const [status, setStatus] = useState('pending');
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
    pending:    { icon: <RefreshCw className="w-4 h-4 animate-spin" />, text: "En attente d'un agent...", cls: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
    processing: { icon: <RefreshCw className="w-4 h-4 animate-spin" />, text: 'Agent en train de traiter votre retrait...', cls: 'bg-blue-50 border-blue-200 text-blue-700' },
    completed:  { icon: <CheckCircle className="w-4 h-4" />, text: 'Terminé ! Votre Orange Money a été crédité.', cls: 'bg-green-50 border-green-200 text-green-700' },
    cancelled:  { icon: <XCircle className="w-4 h-4" />, text: "Transaction annulée par l'agent.", cls: 'bg-red-50 border-red-200 text-red-700' },
  }[status] || { icon: <RefreshCw className="w-4 h-4 animate-spin" />, text: 'En attente...', cls: 'bg-gray-50 border-gray-200 text-gray-600' };

  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium ${cfg.cls}`}>
      {cfg.icon}{cfg.text}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function Withdrawal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { createTransaction, submitting } = useTransactionActions();

  const { amount = 0, platform = '1xbet' } = location.state || {};
  const platformLabel = platform.toUpperCase();

  const [step, setStep]               = useState(S.ACCOUNT_ID);
  const [accountId, setAccountId]     = useState('');
  const [phone, setPhone]             = useState('');
  const [accountName, setAccountName] = useState('');
  const [withdrawCode, setWithdrawCode] = useState('');
  const [txId, setTxId]               = useState('');
  const [error, setError]             = useState('');
  const [cancelled, setCancelled]     = useState(false);

  const next = (validate) => {
    setError('');
    const err = validate?.();
    if (err) { setError(err); return; }
    setStep(s => s + 1);
  };

  // ── Étape 0 : ID de compte ───────────────────────────────────────────────
  if (step === S.ACCOUNT_ID) return (
    <div className="min-h-screen bg-gray-50">
      <Header title={`Retrait ${platformLabel}`} onBack={() => navigate(-1)} />
      <div className="p-5 space-y-5 max-w-md mx-auto">
        <ProgressBar step={S.ACCOUNT_ID} />
        <AmountCard amount={amount} />

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-blue-700 text-sm leading-relaxed">
            Avant de continuer, allez sur <strong>{platformLabel}</strong> et sélectionnez{' '}
            <strong>«&nbsp;Express Multi service&nbsp;»</strong> comme point de retrait pour générer votre code.
          </p>
        </div>

        <Field label={`Votre ID de compte ${platformLabel}`} icon={User}
          value={accountId} onChange={setAccountId} placeholder="Ex : 198287195" />

        {error && <p className="text-red-500 text-sm px-1">{error}</p>}

        <button onClick={() => next(() => !accountId.trim() && 'Veuillez entrer votre ID de compte.')}
          className="w-full bg-[#1e3a8a] hover:bg-[#162660] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all">
          Continuer <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  // ── Étape 1 : Infos Orange Money ─────────────────────────────────────────
  if (step === S.ORANGE_INFO) return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Orange Money" onBack={() => setStep(S.ACCOUNT_ID)} />
      <div className="p-5 space-y-5 max-w-md mx-auto">
        <ProgressBar step={S.ORANGE_INFO} />

        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <p className="text-orange-700 text-sm leading-relaxed">
            Les retraits sont effectués <strong>uniquement via Orange Money</strong>.
            Assurez-vous que le numéro et le nom correspondent exactement à votre compte.
          </p>
        </div>

        <div className="space-y-4">
          <Field label="Numéro Orange Money" icon={Phone} type="tel"
            value={phone} onChange={setPhone}
            placeholder="Ex : 07 12 34 56"
            hint="Ce numéro recevra le virement." />

          <Field label="Nom du titulaire du compte" icon={User}
            value={accountName} onChange={setAccountName}
            placeholder="Prénom et Nom exact sur Orange Money"
            hint="Doit correspondre exactement au nom enregistré." />
        </div>

        {error && <p className="text-red-500 text-sm px-1">{error}</p>}

        <button onClick={() => next(() => {
          if (!phone.replace(/\s/g, '') || phone.replace(/\s/g, '').length < 8) return 'Numéro Orange Money invalide (8 chiffres).';
          if (!accountName.trim()) return 'Veuillez entrer le nom du titulaire.';
        })}
          className="w-full bg-[#1e3a8a] hover:bg-[#162660] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all">
          Continuer <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  // ── Étape 2 : Code de retrait + frais ────────────────────────────────────
  if (step === S.WITHDRAW_CODE) return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Code de retrait" onBack={() => setStep(S.ORANGE_INFO)} />
      <div className="p-5 space-y-5 max-w-md mx-auto">
        <ProgressBar step={S.WITHDRAW_CODE} />

        <FeeBox amount={amount} />

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-2">
          <p className="text-blue-700 font-semibold text-sm">Comment obtenir le code ?</p>
          <ol className="text-blue-600 text-sm space-y-1 list-decimal list-inside">
            <li>Ouvrez <strong>{platformLabel}</strong></li>
            <li>Allez dans <strong>Retrait</strong></li>
            <li>Sélectionnez <strong>Express Multi service</strong></li>
            <li>Entrez <strong>{amount.toLocaleString('fr-FR')} FCFA</strong></li>
            <li>Copiez le code généré ci-dessous</li>
          </ol>
        </div>

        <Field label="Code de retrait" icon={Key}
          value={withdrawCode} onChange={setWithdrawCode}
          placeholder="Entrez le code généré par la plateforme"
          hint="Ce code permet à l'agent de traiter votre retrait." />

        {error && <p className="text-red-500 text-sm px-1">{error}</p>}

        <button onClick={() => next(() => !withdrawCode.trim() && 'Veuillez entrer le code de retrait.')}
          className="w-full bg-[#1e3a8a] hover:bg-[#162660] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all">
          Continuer <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  // ── Étape 3 : Récapitulatif + confirmation ───────────────────────────────
  if (step === S.SUMMARY) {
    const fee = calcFee(amount);
    const net = calcNet(amount);

    const handleConfirm = async () => {
      setError('');
      const result = await createTransaction({
        type: 'withdrawal',
        amount,
        platform,
        accountId: accountId.trim(),
        phone: phone.replace(/\s/g, ''),
        accountName: accountName.trim(),
        withdrawCode: withdrawCode.trim(),
        operator: 'orange',
      });
      if (result.success) { setTxId(result.id); setStep(S.WAITING); }
      else setError(result.error || 'Une erreur est survenue.');
    };

    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Récapitulatif" onBack={() => setStep(S.WITHDRAW_CODE)} />
        <div className="p-5 space-y-5 max-w-md mx-auto">
          <ProgressBar step={S.SUMMARY} />

          {/* Résumé des infos */}
          <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 space-y-1">
            <p className="text-sm font-semibold text-gray-800 mb-3">Vérifiez vos informations</p>
            <SummaryRow label="Plateforme"      value={platformLabel} />
            <SummaryRow label="ID compte"       value={accountId} highlight />
            <SummaryRow label="Orange Money"    value={phone} highlight />
            <SummaryRow label="Titulaire"       value={accountName} />
            <SummaryRow label="Code retrait"    value={`${withdrawCode.slice(0, 4)}••••`} />
          </div>

          {/* Détail financier */}
          <FeeBox amount={amount} />

          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-amber-700 text-sm leading-relaxed">
              Vérifiez attentivement le numéro <strong>{phone}</strong> et le nom{' '}
              <strong>{accountName}</strong>. Toute erreur peut entraîner une perte de fonds.
            </p>
          </div>

          {error && <p className="text-red-500 text-sm px-1">{error}</p>}

          <button onClick={handleConfirm} disabled={submitting}
            className="w-full bg-[#1e3a8a] hover:bg-[#162660] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-base">
            {submitting
              ? <RefreshCw className="w-5 h-5 animate-spin" />
              : <><CheckCircle className="w-5 h-5" /> Confirmer le retrait</>}
          </button>

          <button onClick={() => setStep(S.ACCOUNT_ID)}
            className="w-full py-3 rounded-2xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition">
            Modifier les informations
          </button>
        </div>
      </div>
    );
  }

  // ── Étape 4 : Attente agent ──────────────────────────────────────────────
  if (step === S.WAITING) {
    if (cancelled) return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-sm space-y-5">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Transaction annulée</h2>
          <p className="text-gray-500 text-sm">L'agent a annulé votre demande. Contactez le support pour plus d'informations.</p>
          <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 border-green-500 text-green-600 font-semibold text-sm hover:bg-green-50 transition">
            <MessageCircle className="w-5 h-5" /> Contacter le support
          </a>
          <button onClick={() => navigate('/')}
            className="w-full py-3 rounded-2xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition">
            Retour à l'accueil
          </button>
        </div>
      </div>
    );

    const waMsg = encodeURIComponent(
      `Bonjour, j'ai soumis une demande de retrait de ${amount.toLocaleString('fr-FR')} FCFA depuis mon compte ${platformLabel}. Référence : #${txId.slice(0, 12).toUpperCase()}`
    );

    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="En attente" onBack={() => navigate('/')} />
        <div className="p-5 space-y-4 max-w-md mx-auto">

          {/* Statut */}
          <div className="bg-white rounded-2xl p-6 text-center space-y-4 shadow-sm border border-gray-100">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
              <RefreshCw className="w-8 h-8 text-yellow-500 animate-spin" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-lg">Demande en cours de traitement</h2>
              <p className="text-gray-500 text-sm mt-1">Un agent va prendre en charge votre retrait.</p>
            </div>
          </div>

          {/* Récapitulatif */}
          <div className="bg-[#1e3a8a] rounded-2xl p-5 text-white space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-blue-200">Vous recevrez</span>
              <span className="font-bold text-yellow-300 text-base">{calcNet(amount).toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-blue-200">Sur le numéro</span>
              <span className="font-bold">🟠 {phone}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-blue-200">Titulaire</span>
              <span className="font-bold">{accountName}</span>
            </div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-blue-200">Référence</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold">#{txId.slice(0, 12).toUpperCase()}</span>
                <CopyBtn value={txId.slice(0, 12).toUpperCase()} />
              </div>
            </div>
          </div>

          {/* Statut temps réel */}
          <LiveStatus
            txId={txId}
            onCompleted={() => setStep(S.SUCCESS)}
            onCancelled={() => setCancelled(true)}
          />

          {/* WhatsApp */}
          <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 border-green-500 text-green-600 font-semibold text-sm hover:bg-green-50 transition-all">
            <MessageCircle className="w-5 h-5" /> Contacter le support WhatsApp
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
          <h2 className="text-xl font-bold text-gray-800 mb-2">Retrait effectué !</h2>
          <p className="text-gray-500 text-sm">
            <span className="font-semibold text-gray-800">{calcNet(amount).toLocaleString('fr-FR')} FCFA</span>{' '}
            ont été envoyés sur votre Orange Money{' '}
            <span className="font-semibold text-gray-800">{phone}</span>.
          </p>
        </div>
        <div className="bg-gray-100 rounded-xl px-4 py-3">
          <p className="text-gray-500 text-xs">Référence</p>
          <p className="text-gray-800 font-mono font-bold mt-1">#{txId.slice(0, 12).toUpperCase()}</p>
        </div>
        <button onClick={() => navigate('/')}
          className="w-full bg-[#1e3a8a] hover:bg-[#162660] text-white font-semibold py-4 rounded-2xl transition-all">
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}
