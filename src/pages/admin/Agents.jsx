import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Users, UserCheck, UserX, Shield, Phone,
  RefreshCw, Search, CheckCircle, Eye, EyeOff, Pencil,
  Archive, ArchiveRestore, AlertTriangle,
  Clock, ChevronDown, ChevronUp,
} from 'lucide-react';
import Layout from '../../components/Layout';
import SessionLogsPanel from '../../components/SessionLogsPanel';
import { db } from '../../firebase/config';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, formatCFA, formatRelativeTime } from '../../utils/formatters';

const OPERATOR_LABELS = {
  orange:  { emoji: '🟠', name: 'Orange Money' },
  telmob:  { emoji: '🔵', name: 'Telmob' },
  telecel: { emoji: '🔴', name: 'Telecel' },
};

const RANK_MEDAL = ['🥇', '🥈', '🥉'];
const ACTIVE_STATUSES = ['pending', 'awaiting_confirmation', 'processing'];

// ─── Modal confirmation archivage ────────────────────────────────────────────
function ArchiveAgentModal({ agent, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);

  const handleArchive = async () => {
    setLoading(true);
    await onConfirm(agent.uid);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Archive className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Archiver l'agent</h3>
            <p className="text-gray-500 text-xs">Réversible — l'historique des transactions est conservé</p>
          </div>
        </div>
        <p className="text-gray-400 text-sm mb-5">
          Voulez-vous archiver <span className="text-white font-medium">{agent.name}</span> ? Il n'apparaîtra plus dans la liste active et ne recevra plus de nouvelles commandes, mais son compte et son historique restent intacts. Vous pourrez le réactiver à tout moment.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Annuler</button>
          <button onClick={handleArchive} disabled={loading}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Archive className="w-4 h-4" /> Archiver</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Petit indicateur de statut (point coloré + texte) ───────────────────────
function StatusDot({ color, label }) {
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span className={`w-1.5 h-1.5 rounded-full ${color} flex-shrink-0`} />
      {label}
    </span>
  );
}

// ─── Carte agent ─────────────────────────────────────────────────────────────
// Vue résumée par défaut (identité, statut, stats essentielles) + détails
// dépliables (numéros, historique, actions secondaires) pour ne pas noyer
// l'admin sous l'information. Les alertes ne s'affichent que si elles sont
// réellement pertinentes (charge élevée, taux d'annulation anormal, agent
// indisponible depuis longtemps) plutôt que d'empiler des badges en continu.
function AgentCard({ agent, onToggle, onEdit, onArchive, stats, activeLoad, rank, superAgents, onAssignSuperAgent }) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [assigningSuperAgent, setAssigningSuperAgent] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    await onToggle(agent.uid, !agent.active);
    setLoading(false);
  };

  const handleSuperAgentChange = async (e) => {
    setAssigningSuperAgent(true);
    await onAssignSuperAgent(agent.uid, e.target.value || null);
    setAssigningSuperAgent(false);
  };

  const operatorEntries = Object.entries(agent.operators || {}).filter(([, v]) => v);
  const missingOperators = operatorEntries.length === 0;

  const completedTotal = (stats?.deposits ?? 0) + (stats?.withdrawals ?? 0);
  const cancelledTotal = stats?.cancelled ?? 0;
  const cancelRate = (completedTotal + cancelledTotal) > 0
    ? Math.round((cancelledTotal / (completedTotal + cancelledTotal)) * 100)
    : 0;
  const byOperator = stats?.byOperator || {};

  const hoursSinceUnavailable = agent.active && !agent.available && agent.availabilityChangedAt?.toMillis
    ? (Date.now() - agent.availabilityChangedAt.toMillis()) / 3_600_000
    : 0;

  const alerts = [];
  if (activeLoad >= 3) alerts.push(`${activeLoad} commandes en attente pour cet agent`);
  if (cancelledTotal >= 2 && cancelRate >= 20) alerts.push(`Taux d'annulation élevé (${cancelRate}%)`);
  if (hoursSinceUnavailable >= 2) {
    alerts.push(`Indisponible ${formatRelativeTime(agent.availabilityChangedAt).toLowerCase()}`);
  }

  return (
    <div className="card hover:border-gray-700 transition-all">
      <div className="flex items-start gap-3">
        {/* Zone cliquable : identité + résumé */}
        <button onClick={() => setExpanded(v => !v)} className="flex-1 min-w-0 flex items-start gap-3 text-left">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0
            ${agent.active ? 'bg-primary-500/10' : 'bg-gray-800'}`}>
            <Shield className={`w-5 h-5 ${agent.active ? 'text-primary-400' : 'text-gray-500'}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {rank <= 3 && (
                <span className="text-sm" title={`#${rank} au classement`}>{RANK_MEDAL[rank - 1]}</span>
              )}
              <span className="text-white font-semibold truncate">{agent.name || 'Agent'}</span>
            </div>

            <div className="flex items-center gap-3 mt-1">
              <StatusDot color={agent.active ? 'bg-green-400' : 'bg-red-400'} label={agent.active ? 'Actif' : 'Inactif'} />
              {agent.active && (
                <StatusDot color={agent.available ? 'bg-emerald-400' : 'bg-gray-500'}
                  label={agent.available ? 'Disponible' : 'Indisponible'} />
              )}
            </div>

            <p className="text-gray-500 text-xs mt-1.5">
              {stats?.deposits ?? 0} dépôts · {stats?.withdrawals ?? 0} retraits ·{' '}
              <span className="text-primary-400 font-medium">{formatCFA(stats?.totalAmount ?? 0)}</span> traités
            </p>
          </div>
        </button>

        {/* Actions rapides */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <button onClick={handleToggle} disabled={loading}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all
              ${agent.active
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
              } disabled:opacity-50`}>
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              : agent.active ? <><UserX className="w-3.5 h-3.5" /> Désactiver</>
              : <><UserCheck className="w-3.5 h-3.5" /> Activer</>}
          </button>
          <button onClick={() => setExpanded(v => !v)} className="text-gray-600 hover:text-gray-400 p-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Alertes ciblées, seulement si pertinentes */}
      {alerts.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {alerts.map((a, i) => (
            <div key={i} className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="text-amber-300 text-xs">{a}</span>
            </div>
          ))}
        </div>
      )}

      {missingOperators && (
        <button onClick={() => onEdit(agent)}
          className="mt-3 w-full text-xs text-amber-400 bg-amber-400/10 px-3 py-2 rounded-lg border border-amber-400/20 flex items-center justify-center gap-1.5">
          <Pencil className="w-3 h-3" /> Ajouter les numéros Mobile Money
        </button>
      )}

      {/* Détails dépliés */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-800/60 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-1.5 text-gray-400 text-xs">
              <Phone className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" /> {agent.phone}
            </div>
            <div className="flex items-center gap-1.5 text-gray-400 text-xs">
              <Clock className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
              {agent.lastLoginAt
                ? `Connecté ${formatRelativeTime(agent.lastLoginAt).toLowerCase()}`
                : 'Jamais connecté'}
            </div>
          </div>

          {!missingOperators && (
            <div className="flex flex-wrap gap-2">
              {operatorEntries.map(([opId, number]) => (
                <span key={opId} className="text-xs text-gray-300 bg-gray-800 px-2.5 py-1.5 rounded-lg">
                  {OPERATOR_LABELS[opId]?.emoji} {number}
                  {byOperator[opId]?.count > 0 && <span className="text-gray-500"> · {byOperator[opId].count} traitées</span>}
                </span>
              ))}
            </div>
          )}

          {stats?.lastActivityAt && (
            <p className="text-gray-600 text-xs">
              Dernière commande traitée {formatRelativeTime(stats.lastActivityAt).toLowerCase()}
            </p>
          )}

          {/* Assignation à un SuperAgent — supervision d'équipe, indépendante
              de l'activation/désactivation de l'agent lui-même. */}
          <div>
            <label className="text-gray-500 text-xs mb-1 block">Superviseur</label>
            <div className="relative">
              <select
                value={agent.superAgentId || ''}
                onChange={handleSuperAgentChange}
                disabled={assigningSuperAgent || superAgents.length === 0}
                className="input-field text-sm py-2 disabled:opacity-50"
              >
                <option value="">Aucun</option>
                {superAgents.map((sa) => (
                  <option key={sa.uid} value={sa.uid}>{sa.name || 'Superviseur'}</option>
                ))}
              </select>
              {assigningSuperAgent && (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              )}
            </div>
            {superAgents.length === 0 && (
              <p className="text-gray-600 text-xs mt-1">Aucun Superviseur créé pour le moment.</p>
            )}
          </div>

          <SessionLogsPanel uid={agent.uid} name={agent.name} />

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-4">
              <button onClick={() => onEdit(agent)}
                className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors">
                <Pencil className="w-3 h-3" /> Modifier numéros
              </button>
              <button onClick={() => onArchive(agent)}
                className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 transition-colors">
                <Archive className="w-3 h-3" /> Archiver
              </button>
            </div>
            {agent.createdAt && (
              <span className="text-gray-700 text-xs">Inscrit le {formatDate(agent.createdAt)}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Carte agent archivé ──────────────────────────────────────────────────────
function ArchivedAgentCard({ agent, onReactivate }) {
  const [loading, setLoading] = useState(false);
  const handleReactivate = async () => {
    setLoading(true);
    await onReactivate(agent.uid);
    setLoading(false);
  };
  return (
    <div className="card flex items-center gap-4 opacity-75">
      <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
        <Archive className="w-5 h-5 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-300 font-medium text-sm">{agent.name || 'Agent'}</p>
        <p className="text-gray-600 text-xs">{agent.phone}</p>
      </div>
      <button onClick={handleReactivate} disabled={loading}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 disabled:opacity-50 flex-shrink-0">
        {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <><ArchiveRestore className="w-3.5 h-3.5" /> Réactiver</>}
      </button>
    </div>
  );
}

// ─── Champ opérateur réutilisable ─────────────────────────────────────────────
function OperatorInput({ emoji, label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="label">{emoji} {label}</label>
      <input type="tel" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} className="input-field" maxLength={10} />
    </div>
  );
}

// ─── Modal modification des numéros d'un agent existant ──────────────────────
function EditOperatorsModal({ agent, onClose }) {
  const [opOrange,  setOpOrange]  = useState(agent.operators?.orange  || '');
  const [opTelmob,  setOpTelmob]  = useState(agent.operators?.telmob  || '');
  const [opTelecel, setOpTelecel] = useState(agent.operators?.telecel || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]   = useState('');

  const handleSave = async () => {
    if (!opOrange.trim() && !opTelmob.trim() && !opTelecel.trim()) {
      setError('Veuillez saisir au moins un numéro Mobile Money.');
      return;
    }
    setError('');
    setLoading(true);

    const operators = {};
    if (opOrange.trim())  operators.orange  = opOrange.replace(/\s/g, '');
    if (opTelmob.trim())  operators.telmob  = opTelmob.replace(/\s/g, '');
    if (opTelecel.trim()) operators.telecel = opTelecel.replace(/\s/g, '');

    try {
      await updateDoc(doc(db, 'users', agent.uid), {
        operators,
        updatedAt: serverTimestamp(),
      });
      setSuccess(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-sm">
        <h3 className="section-title mb-1">Numéros Mobile Money</h3>
        <p className="text-gray-500 text-xs mb-4">
          Agent : <span className="text-white font-medium">{agent.name}</span>
        </p>

        {success ? (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <p className="text-green-400 text-sm">Numéros mis à jour avec succès !</p>
            </div>
            <button onClick={onClose} className="btn-primary w-full text-sm">Fermer</button>
          </div>
        ) : (
          <div className="space-y-3">
            <OperatorInput emoji="🟠" label="Orange Money" value={opOrange}
              onChange={setOpOrange} placeholder="07 XX XX XX" />
            <OperatorInput emoji="🔵" label="Telmob" value={opTelmob}
              onChange={setOpTelmob} placeholder="60 XX XX XX" />
            <OperatorInput emoji="🔴" label="Telecel" value={opTelecel}
              onChange={setOpTelecel} placeholder="55 XX XX XX" />

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} className="btn-secondary flex-1 text-sm">Annuler</button>
              <button onClick={handleSave} disabled={loading} className="btn-primary flex-1 text-sm">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal création d'un nouvel agent ────────────────────────────────────────
function CreateAgentModal({ onClose }) {
  const { createAgentAccount } = useAuth();
  const [name,      setName]      = useState('');
  const [phone,     setPhone]     = useState('');
  const [password,  setPassword]  = useState('');
  const [showPwd,   setShowPwd]   = useState(false);
  const [opOrange,  setOpOrange]  = useState('');
  const [opTelmob,  setOpTelmob]  = useState('');
  const [opTelecel, setOpTelecel] = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  const handleCreate = async () => {
    if (!name.trim() || !phone.trim() || !password) return;
    if (phone.replace(/\D/g, '').length < 8) { setError('Numéro de téléphone invalide.'); return; }
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }
    if (!opOrange.trim() && !opTelmob.trim() && !opTelecel.trim()) {
      setError('Veuillez saisir au moins un numéro Mobile Money.');
      return;
    }

    setError(''); setSuccess(''); setLoading(true);

    const operators = {};
    if (opOrange.trim())  operators.orange  = opOrange.replace(/\s/g, '');
    if (opTelmob.trim())  operators.telmob  = opTelmob.replace(/\s/g, '');
    if (opTelecel.trim()) operators.telecel = opTelecel.replace(/\s/g, '');

    const result = await createAgentAccount(name.trim(), phone, password, operators);
    setLoading(false);

    if (result.success) {
      setSuccess(`Compte créé pour ${name.trim()}`);
      setName(''); setPhone(''); setPassword('');
      setOpOrange(''); setOpTelmob(''); setOpTelecel('');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <h3 className="section-title mb-1">Créer un compte agent</h3>
        <p className="text-gray-500 text-xs mb-5">
          L'agent se connecte sur <span className="text-gray-300">/agent/login</span>.
        </p>

        <div className="space-y-4">
          <div>
            <label className="label">Nom complet</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex : Moussa Traoré" className="input-field" autoFocus />
          </div>

          <div>
            <label className="label">Numéro de connexion</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-gray-400 text-sm">🇧🇫 +226</span>
                <div className="w-px h-5 bg-gray-700" />
              </div>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="70 00 00 00" className="input-field pl-24" maxLength={12} />
            </div>
          </div>

          <div>
            <label className="label">Mot de passe</label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 6 caractères" className="input-field pr-12" />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-3">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">
              Numéros Mobile Money de l'agent
            </p>
            <div className="space-y-3">
              <OperatorInput emoji="🟠" label="Orange Money" value={opOrange}
                onChange={setOpOrange} placeholder="07 XX XX XX" />
              <OperatorInput emoji="🔵" label="Telmob" value={opTelmob}
                onChange={setOpTelmob} placeholder="60 XX XX XX" />
              <OperatorInput emoji="🔴" label="Telecel" value={opTelecel}
                onChange={setOpTelecel} placeholder="55 XX XX XX" />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1 text-sm">
              {success ? 'Fermer' : 'Annuler'}
            </button>
            {!success && (
              <button onClick={handleCreate}
                disabled={!name.trim() || !phone.trim() || !password || loading}
                className="btn-primary flex-1 text-sm">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Créer le compte'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function AdminAgents() {
  const [agents,        setAgents]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [showCreate,    setShowCreate]    = useState(false);
  const [editingAgent,  setEditingAgent]  = useState(null);
  const [archivingAgent, setArchivingAgent] = useState(null);
  const [agentStats,    setAgentStats]    = useState({});
  const [activeLoad,    setActiveLoad]    = useState({});
  const [showArchived,  setShowArchived]  = useState(false);
  const [superAgents,   setSuperAgents]   = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'agent'));
    return onSnapshot(q, (snap) => {
      setAgents(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  // Liste des SuperAgents actifs, pour le menu d'assignation par agent.
  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'superagent'), where('active', '==', true));
    return onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ uid: d.id, ...d.data() }))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setSuperAgents(list);
    });
  }, []);

  const assignSuperAgent = async (agentUid, superAgentId) => {
    await updateDoc(doc(db, 'users', agentUid), { superAgentId, updatedAt: serverTimestamp() });
  };

  // Stats de performance par agent : transactions terminées (dépôts/retraits,
  // montant, répartition par opérateur, dernière activité) et annulées (taux
  // d'annulation).
  useEffect(() => {
    const qDone = query(collection(db, 'transactions'), where('status', 'in', ['completed', 'cancelled']));
    return onSnapshot(qDone, (snap) => {
      const stats = {};
      snap.docs.forEach(d => {
        const { agentId, type, amount, operator, status, updatedAt } = d.data();
        if (!agentId) return;
        if (!stats[agentId]) {
          stats[agentId] = { deposits: 0, withdrawals: 0, cancelled: 0, totalAmount: 0, byOperator: {}, lastActivityAt: null };
        }
        const s = stats[agentId];
        if (status === 'cancelled') {
          s.cancelled++;
        } else {
          if (type === 'deposit') s.deposits++;
          else s.withdrawals++;
          s.totalAmount += (amount || 0);
          if (operator) {
            if (!s.byOperator[operator]) s.byOperator[operator] = { count: 0 };
            s.byOperator[operator].count++;
          }
        }
        const t = updatedAt?.toMillis ? updatedAt.toMillis() : 0;
        if (!s.lastActivityAt || t > (s.lastActivityAt.toMillis?.() || 0)) {
          s.lastActivityAt = updatedAt || s.lastActivityAt;
        }
      });
      setAgentStats(stats);
    });
  }, []);

  // Charge de travail actuelle : commandes non terminées assignées à chaque agent.
  useEffect(() => {
    const qActive = query(collection(db, 'transactions'), where('status', 'in', ACTIVE_STATUSES));
    return onSnapshot(qActive, (snap) => {
      const load = {};
      snap.docs.forEach(d => {
        const { assignedAgentId } = d.data();
        if (!assignedAgentId) return;
        load[assignedAgentId] = (load[assignedAgentId] || 0) + 1;
      });
      setActiveLoad(load);
    });
  }, []);

  const toggleAgent = async (uid, active) => {
    await updateDoc(doc(db, 'users', uid), { active, updatedAt: serverTimestamp() });
  };

  // Archivage réversible : on désactive et on marque l'agent comme archivé
  // plutôt que de supprimer son document, pour conserver l'attribution de
  // son historique de transactions déjà traité.
  const archiveAgent = async (uid) => {
    await updateDoc(doc(db, 'users', uid), {
      archived: true,
      active: false,
      available: false,
      updatedAt: serverTimestamp(),
    });
  };

  const reactivateAgent = async (uid) => {
    await updateDoc(doc(db, 'users', uid), {
      archived: false,
      updatedAt: serverTimestamp(),
    });
  };

  const liveAgents = agents.filter(a => !a.archived);
  const archivedAgents = agents.filter(a => a.archived);

  const filtered = liveAgents
    .filter(a => {
      if (!search) return true;
      const q = search.toLowerCase();
      return a.name?.toLowerCase().includes(q) || a.phone?.includes(q);
    })
    .sort((a, b) => {
      const aTotal = (agentStats[a.uid]?.deposits || 0) + (agentStats[a.uid]?.withdrawals || 0);
      const bTotal = (agentStats[b.uid]?.deposits || 0) + (agentStats[b.uid]?.withdrawals || 0);
      return bTotal - aTotal; // meilleur en premier
    });

  const activeCount = liveAgents.filter(a => a.active).length;
  const missingCount = liveAgents.filter(a => !a.operators || Object.keys(a.operators).length === 0).length;

  return (
    <Layout>
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Gestion des agents</h1>
            <p className="text-gray-500 text-sm mt-1">
              {activeCount} actif{activeCount !== 1 ? 's' : ''} sur {liveAgents.length}
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm py-2">
            <Shield className="w-4 h-4" /> Créer un agent
          </button>
        </div>

        {/* Alerte agents sans numéros */}
        {missingCount > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <p className="text-amber-300 text-sm">
              <span className="font-semibold">{missingCount} agent{missingCount > 1 ? 's' : ''}</span> sans numéros Mobile Money configurés.
              Cliquez sur <span className="font-semibold">"Ajouter numéros"</span> pour que les dépôts leur soient assignés.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-gray-500 text-xs">Agents actifs</p>
              <p className="text-white font-bold text-xl">{activeCount}</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
              <UserX className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-gray-500 text-xs">Agents inactifs</p>
              <p className="text-white font-bold text-xl">{liveAgents.length - activeCount}</p>
            </div>
          </div>
        </div>

        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou téléphone..."
            className="input-field pl-11" />
        </div>

        {/* Liste */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="card animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-800 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-800 rounded w-32 mb-2" />
                    <div className="h-3 bg-gray-800 rounded w-24" />
                  </div>
                  <div className="w-24 h-8 bg-gray-800 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-12">
            <Users className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">Aucun agent trouvé</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
              Créer un agent
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((agent, index) => (
              <AgentCard key={agent.uid} agent={agent}
                onToggle={toggleAgent}
                onEdit={setEditingAgent}
                onArchive={setArchivingAgent}
                stats={agentStats[agent.uid]}
                activeLoad={activeLoad[agent.uid] || 0}
                rank={index + 1}
                superAgents={superAgents}
                onAssignSuperAgent={assignSuperAgent} />
            ))}
          </div>
        )}

        {/* Agents archivés */}
        {archivedAgents.length > 0 && (
          <div>
            <button onClick={() => setShowArchived(v => !v)}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm font-medium transition-colors">
              <Archive className="w-4 h-4" />
              Agents archivés ({archivedAgents.length})
              {showArchived ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showArchived && (
              <div className="space-y-2 mt-3">
                {archivedAgents.map(agent => (
                  <ArchivedAgentCard key={agent.uid} agent={agent} onReactivate={reactivateAgent} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showCreate && <CreateAgentModal onClose={() => setShowCreate(false)} />}
      {editingAgent && (
        <EditOperatorsModal
          agent={editingAgent}
          onClose={() => setEditingAgent(null)}
        />
      )}
      {archivingAgent && (
        <ArchiveAgentModal
          agent={archivingAgent}
          onClose={() => setArchivingAgent(null)}
          onConfirm={archiveAgent}
        />
      )}
    </Layout>
  );
}
