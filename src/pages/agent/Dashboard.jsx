import React, { useState, useEffect } from 'react';
import {
  Inbox, CheckCircle, XCircle, Clock,
  ArrowDownCircle, ArrowUpCircle, RefreshCw,
  AlertCircle, Phone, User, ChevronDown, ChevronUp,
  Wifi, WifiOff, BellRing, CreditCard, Key,
} from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import { useAgentTransactions, useTransactionActions, setAgentAvailability } from '../../hooks/useTransactions';
import { useAuth } from '../../hooks/useAuth';
import { formatCFA, formatDate, formatTxId } from '../../utils/formatters';
import { OPERATORS, AGENT_NUMBERS } from '../../utils/constants';
import { mobcashDeposit } from '../../utils/mobcash';
import OperatorLogo from '../../components/OperatorLogo';
import {
  isNotificationSupported, getNotificationPermission, requestNotificationPermission,
} from '../../utils/notifications';

function OrderCard({ transaction, onProcess, onComplete, onCancel, agentName }) {
  const [expanded, setExpanded] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelInput, setShowCancelInput] = useState(false);
  const [loading, setLoading] = useState(false);
  // État du crédit automatique MobCash (dépôts 1xBet uniquement) — null tant
  // qu'aucune tentative n'a eu lieu sur cette commande.
  const [mobcashStatus, setMobcashStatus] = useState(null);

  const isDeposit = transaction.type === 'deposit';
  const operator = isDeposit
    ? AGENT_NUMBERS.find(op => op.id === transaction.operator)
    : OPERATORS.find(op => op.id === transaction.operator);
  const isAwaitingConfirm = transaction.status === 'awaiting_confirmation';
  // 'processing' ne devrait plus être produit par de nouvelles commandes
  // (traitement en un clic), mais on garde ce cas pour d'éventuelles
  // commandes déjà en cours créées avant ce changement.
  const isProcessing = transaction.status === 'processing';
  const canClaim = transaction.status === 'pending' || isAwaitingConfirm;
  const isAutoCreditable = isDeposit && transaction.platform === '1xbet';

  // Numéro affiché : numéro spécifique de l'agent si disponible, sinon générique
  const displayNumber = isDeposit
    ? (transaction.agentOperatorNumber || transaction.clientPhone)
    : transaction.phone;

  const handleProcess = async () => {
    setLoading(true);

    // IMPORTANT : processOrder() fait passer la commande directement à
    // 'completed' en un seul clic (pas d'étape 'processing' intermédiaire
    // dans le flux actuel) — donc le crédit MobCash doit être tenté AVANT
    // cet appel, pas après. Le cas isProcessing ne subsiste que pour
    // d'éventuelles commandes déjà bloquées dans cet état légataire.
    if (isAutoCreditable) {
      setMobcashStatus({ state: 'loading' });
      const res = await mobcashDeposit(transaction.accountId, transaction.amount);

      if (res.unavailable) {
        // Service injoignable OU délai dépassé côté navigateur — dans les
        // deux cas on NE SAIT PAS si le dépôt a réellement été fait côté
        // MobCash. On bloque la complétion automatique par sécurité :
        // l'agent doit vérifier manuellement avant de forcer la validation.
        setMobcashStatus({ state: 'unavailable', message: res.error });
        setLoading(false);
        return;
      } else if (!res.ok || !res.data.success) {
        setMobcashStatus({ state: 'error', message: res.data?.error || res.data?.reason || res.error || 'Échec du crédit automatique.' });
        setLoading(false);
        return; // pas de complétion automatique si le crédit a échoué
      } else {
        setMobcashStatus({ state: 'success', message: res.data.confirmationMessage || 'Compte crédité automatiquement sur 1xBet.' });
      }
    }

    if (isProcessing) {
      await onComplete(transaction.id);
    } else {
      await onProcess(transaction.id, agentName);
    }
    setLoading(false);
  };

  // Repli manuel : l'agent a vérifié/crédité lui-même sur MobCash, on termine
  // sans retenter l'automatisation.
  const handleForceComplete = async () => {
    setLoading(true);
    if (isProcessing) {
      await onComplete(transaction.id);
    } else {
      await onProcess(transaction.id, agentName);
    }
    setLoading(false);
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    setLoading(true);
    await onCancel(transaction.id, cancelReason, agentName);
    setLoading(false);
  };

  return (
    <div className={`card border transition-all ${
      isProcessing ? 'border-blue-500/30' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
          ${isDeposit ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          {isDeposit
            ? <ArrowDownCircle className="w-5 h-5 text-green-400" />
            : <ArrowUpCircle className="w-5 h-5 text-red-400" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 dark:text-white text-sm">
              {isDeposit ? 'Dépôt' : 'Retrait'}
            </span>
            <span className="text-gray-500 text-xs">{formatTxId(transaction.id)}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-primary-400 font-bold">{formatCFA(transaction.amount)}</span>
            {operator && (
              <span className="text-gray-500 text-xs flex items-center gap-1">• <OperatorLogo operator={operator} className="h-3.5" boxed /> {operator.name}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={transaction.status} />
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </div>
      </div>

      {/* Détails expandés */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 space-y-4">

          {/* Alerte paiement confirmé par client */}
          {isAwaitingConfirm && (
            <div className="bg-purple-500/15 border border-purple-500/30 rounded-xl px-3 py-2.5 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <p className="text-purple-300 text-xs font-medium">
                Le client a confirmé son paiement via {operator?.name} — vérifiez la réception sur votre compte
              </p>
            </div>
          )}

          {/* Infos client */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5 col-span-2">
              <p className="text-gray-500 text-xs mb-1">ID de compte {transaction.platform?.toUpperCase()}</p>
              <div className="flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-900 dark:text-white text-sm font-bold">
                  {transaction.accountId || '—'}
                </span>
              </div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5">
              <p className="text-gray-500 text-xs mb-1">Client</p>
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-white text-sm font-medium truncate">
                  {transaction.clientName || 'Inconnu'}
                </span>
              </div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5">
              <p className="text-gray-500 text-xs mb-1">{isDeposit ? 'N° du client' : 'Téléphone'}</p>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-900 dark:text-white text-sm font-medium">
                  {isDeposit ? transaction.clientPhone : transaction.phone}
                </span>
              </div>
            </div>
            {isDeposit && transaction.agentOperatorNumber && (
              <div className="bg-gray-800 rounded-xl px-3 py-2.5">
                <p className="text-gray-500 text-xs mb-1">Votre numéro {operator?.name}</p>
                <span className="text-gray-900 dark:text-white text-sm font-medium">{transaction.agentOperatorNumber}</span>
              </div>
            )}
            {transaction.platform === 'canalplus' && (
              <>
                <div className="bg-gray-800 rounded-xl px-3 py-2.5">
                  <p className="text-gray-500 text-xs mb-1">Titulaire décodeur</p>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-900 dark:text-white text-sm font-medium truncate">
                      {transaction.holderName || '—'}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5 col-span-2">
                  <p className="text-gray-500 text-xs mb-1">Offre à recharger</p>
                  <span className="text-gray-900 dark:text-white text-sm font-bold">
                    {transaction.offerName} — {transaction.durationLabel}
                    {transaction.optionName && transaction.optionName !== 'Aucune option' ? ` + ${transaction.optionName}` : ''}
                  </span>
                </div>
              </>
            )}
            {transaction.platform === 'canalbox' && (
              <>
                <div className="bg-gray-800 rounded-xl px-3 py-2.5">
                  <p className="text-gray-500 text-xs mb-1">Titulaire box</p>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-900 dark:text-white text-sm font-medium truncate">
                      {transaction.holderName || '—'}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5 col-span-2">
                  <p className="text-gray-500 text-xs mb-1">Offre à renouveler</p>
                  <span className="text-gray-900 dark:text-white text-sm font-bold">
                    {transaction.offerName} — {transaction.durationLabel}
                  </span>
                </div>
              </>
            )}
            {!isDeposit && (
              <>
                <div className="bg-gray-800 rounded-xl px-3 py-2.5">
                  <p className="text-gray-500 text-xs mb-1">Titulaire Orange Money</p>
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-900 dark:text-white text-sm font-medium truncate">
                      {transaction.accountName || '—'}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-xl px-3 py-2.5">
                  <p className="text-gray-500 text-xs mb-1">Code de retrait</p>
                  <div className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-gray-900 dark:text-white text-sm font-bold">
                      {transaction.withdrawCode || '—'}
                    </span>
                  </div>
                </div>
              </>
            )}
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5">
              <p className="text-gray-500 text-xs mb-1">Plateforme</p>
              <span className="text-gray-900 dark:text-white text-sm">{transaction.platform?.toUpperCase()}</span>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5">
              <p className="text-gray-500 text-xs mb-1">Date</p>
              <span className="text-gray-900 dark:text-white text-sm">{formatDate(transaction.createdAt)}</span>
            </div>
          </div>

          {/* Statut du crédit automatique MobCash (dépôts 1xBet) */}
          {mobcashStatus && (
            <div className={`rounded-xl px-3 py-2.5 flex items-start gap-2.5 border
              ${mobcashStatus.state === 'success' ? 'bg-green-500/10 border-green-500/30'
                : mobcashStatus.state === 'error' ? 'bg-red-500/10 border-red-500/30'
                : 'bg-amber-500/10 border-amber-500/30'}`}>
              {mobcashStatus.state === 'loading' && <RefreshCw className="w-4 h-4 text-primary-400 animate-spin flex-shrink-0 mt-0.5" />}
              {mobcashStatus.state === 'success' && <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />}
              {mobcashStatus.state === 'error' && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />}
              {mobcashStatus.state === 'unavailable' && <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />}
              <div>
                <p className="text-gray-900 dark:text-white text-xs font-semibold">
                  {mobcashStatus.state === 'loading' && 'Crédit automatique MobCash en cours...'}
                  {mobcashStatus.state === 'success' && 'Compte 1xBet crédité automatiquement'}
                  {mobcashStatus.state === 'error' && 'Échec du crédit automatique'}
                  {mobcashStatus.state === 'unavailable' && 'Résultat du crédit automatique incertain'}
                </p>
                {mobcashStatus.message && <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{mobcashStatus.message}</p>}
                {mobcashStatus.state === 'unavailable' && (
                  <p className="text-amber-400 text-xs mt-1">
                    Vérifiez l'historique MobCash avant de créditer à nouveau ou de valider.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Bouton d'action unique : traite (accepte + termine) en un clic */}
          {(canClaim || isProcessing) && (
            <div className="flex gap-2">
              <button onClick={handleProcess} disabled={loading} className="btn-primary flex-1">
                {loading
                  ? <RefreshCw className="w-4 h-4 animate-spin" />
                  : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      {isProcessing ? 'Marquer terminé' : isAwaitingConfirm ? 'Vérifier & Traiter' : 'Traiter'}
                    </>
                  )
                }
              </button>
              {(mobcashStatus?.state === 'error' || mobcashStatus?.state === 'unavailable') && (
                <button
                  onClick={handleForceComplete}
                  disabled={loading}
                  className="btn-secondary flex-1 text-xs"
                >
                  Crédité à la main — Terminer
                </button>
              )}
              <button onClick={() => setShowCancelInput(!showCancelInput)} className="btn-danger flex-1">
                <XCircle className="w-4 h-4" /> Annuler
              </button>
            </div>
          )}

          {showCancelInput && (
            <div className="space-y-2">
              <input type="text" value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                placeholder="Raison de l'annulation..." className="input-field text-sm" />
              <button onClick={handleCancel} disabled={!cancelReason.trim() || loading}
                className="btn-danger w-full text-sm">
                Confirmer l'annulation
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgentDashboard() {
  const { transactions, loading } = useAgentTransactions();
  const { processOrder, completeOrder, cancelOrder } = useTransactionActions();
  const { userProfile, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');

  const agentName = userProfile?.name || 'Agent';

  // ── Disponibilité ─────────────────────────────────────────────────────────
  const [toggling, setToggling]                 = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');

  const isAvailable = !!userProfile?.available;

  // ── Notifications navigateur ─────────────────────────────────────────────
  const [notifPermission, setNotifPermission] = useState(getNotificationPermission());
  const [requestingNotif, setRequestingNotif] = useState(false);

  const handleEnableNotifications = async () => {
    setRequestingNotif(true);
    const result = await requestNotificationPermission();
    setNotifPermission(result);
    setRequestingNotif(false);
  };

  const handleToggleAvailability = async () => {
    if (!userProfile) return;
    const ops = userProfile.operators || {};
    if (Object.keys(ops).length === 0) {
      setAvailabilityError('Aucun numéro opérateur configuré. Contactez l\'administrateur.');
      return;
    }
    setToggling(true);
    setAvailabilityError('');
    try {
      await setAgentAvailability(userProfile.uid, !isAvailable);
      await refreshProfile();
    } catch (e) {
      setAvailabilityError(e.message || 'Erreur de mise à jour.');
    }
    setToggling(false);
  };

  // Une commande non assignée (assignedAgentId null, cas de repli quand aucun
  // agent n'était disponible à sa création) ne doit être proposée qu'aux
  // agents actuellement disponibles — sinon un agent qui vient de se mettre
  // indisponible continue de recevoir de nouvelles demandes en diffusion.
  // Une commande qui lui est explicitement assignée reste visible dans tous
  // les cas, y compris s'il passe indisponible en cours de traitement.
  const pending = transactions.filter(t => {
    if (t.status !== 'pending' && t.status !== 'awaiting_confirmation') return false;
    const isMine = t.assignedAgentId === userProfile?.uid;
    return isMine || isAvailable;
  });
  const processing = transactions.filter(t => t.status === 'processing');

  const displayed = activeTab === 'pending'    ? pending
                  : activeTab === 'processing' ? processing
                  : transactions;

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="page-title">Mes commandes</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Bonjour <span className="text-gray-900 dark:text-white font-medium">{agentName}</span>
          </p>
        </div>

        {/* ── Bannière notifications ───────────────────────────────────── */}
        {isNotificationSupported() && notifPermission === 'default' && (
          <div className="rounded-2xl p-4 border-2 border-primary-500/30 bg-primary-500/10 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <BellRing className="w-5 h-5 text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-primary-700 dark:text-primary-300">Activez les notifications</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                Soyez alerté (son + notification) dès qu'une nouvelle commande arrive.
              </p>
            </div>
            <button
              onClick={handleEnableNotifications}
              disabled={requestingNotif}
              className="flex-shrink-0 px-3 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold transition-all disabled:opacity-60"
            >
              {requestingNotif ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Activer'}
            </button>
          </div>
        )}
        {isNotificationSupported() && notifPermission === 'denied' && (
          <div className="rounded-2xl p-3 border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/50 flex items-center gap-3">
            <BellRing className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <p className="text-gray-500 text-xs">
              Notifications bloquées par le navigateur. Autorisez-les dans les paramètres du site pour être alerté des nouvelles commandes.
            </p>
          </div>
        )}

        {/* ── Toggle disponibilité ─────────────────────────────────────── */}
        <div className={`rounded-2xl p-4 border-2 transition-all duration-300
          ${isAvailable
            ? 'bg-green-500/10 border-green-500/30'
            : 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
          }`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                ${isAvailable ? 'bg-green-500/20' : 'bg-gray-200 dark:bg-gray-700'}`}>
                {isAvailable
                  ? <Wifi className="w-5 h-5 text-green-400" />
                  : <WifiOff className="w-5 h-5 text-gray-500" />
                }
              </div>
              <div>
                <p className={`font-semibold text-sm ${isAvailable ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                  {isAvailable ? 'Disponible pour les dépôts' : 'Indisponible'}
                </p>
                <p className="text-gray-500 text-xs mt-0.5">
                  {isAvailable
                    ? 'Les clients peuvent vous être assignés'
                    : 'Activez pour commencer à recevoir des dépôts'
                  }
                </p>
              </div>
            </div>

            {/* Toggle switch */}
            <button
              onClick={handleToggleAvailability}
              disabled={toggling}
              className={`relative w-14 h-7 rounded-full transition-all duration-300 flex-shrink-0 disabled:opacity-60
                ${isAvailable ? 'bg-green-500' : 'bg-gray-600'}`}>
              {toggling
                ? <RefreshCw className="w-4 h-4 text-white animate-spin absolute inset-0 m-auto" />
                : <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300
                    ${isAvailable ? 'left-7' : 'left-0.5'}`} />
              }
            </button>
          </div>

          {availabilityError && (
            <p className="text-red-400 text-xs mt-2 bg-red-400/10 px-3 py-1.5 rounded-lg">
              {availabilityError}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-gray-500 text-xs">À traiter</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{pending.length}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-500 text-xs">En cours</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{processing.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-900 rounded-xl p-1 border border-gray-200 dark:border-gray-800">
          {[
            { key: 'pending',    label: `À traiter (${pending.length})` },
            { key: 'processing', label: `En cours (${processing.length})` },
            { key: 'all',        label: `Tout (${transactions.length})` },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all duration-200
                ${activeTab === tab.key ? 'bg-primary-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Liste */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="card animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-32 mb-2" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="card text-center py-12">
            <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Aucune commande</p>
            <p className="text-gray-400 dark:text-gray-600 text-sm mt-1">
              Les nouvelles commandes vous seront assignées automatiquement
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map(tx => (
              <OrderCard key={tx.id} transaction={tx}
                onProcess={processOrder} onComplete={completeOrder} onCancel={cancelOrder}
                agentName={agentName} />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
