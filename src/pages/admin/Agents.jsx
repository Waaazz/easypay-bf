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
} from 'lucide-react';
import Layout from '../../components/Layout';
import { db } from '../../firebase/config';
import { useAuth } from '../../hooks/useAuth';
import { formatDate } from '../../utils/formatters';

const OPERATOR_LABELS = {
  orange:  { emoji: '🟠', name: 'Orange Money' },
  telmob:  { emoji: '🔵', name: 'Telmob' },
  telecel: { emoji: '🔴', name: 'Telecel' },
};

// ─── Carte agent ─────────────────────────────────────────────────────────────
function AgentCard({ agent, onToggle, onEdit }) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    await onToggle(agent.uid, !agent.active);
    setLoading(false);
  };

  const operatorEntries = Object.entries(agent.operators || {}).filter(([, v]) => v);
  const missingOperators = operatorEntries.length === 0;

  return (
    <div className="card hover:border-gray-700 transition-all">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
          ${agent.active ? 'bg-primary-500/10' : 'bg-gray-800'}`}>
          <Shield className={`w-6 h-6 ${agent.active ? 'text-primary-400' : 'text-gray-500'}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold truncate">{agent.name || 'Agent'}</span>
            {agent.active ? (
              <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/20">
                Actif
              </span>
            ) : (
              <span className="text-xs text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20">
                Inactif
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <Phone className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-gray-400 text-sm">{agent.phone}</span>
          </div>

          {/* Numéros opérateurs */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {operatorEntries.map(([op, num]) => (
              <span key={op} className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">
                {OPERATOR_LABELS[op]?.emoji} {num}
              </span>
            ))}
            {missingOperators && (
              <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                ⚠ Numéros non configurés
              </span>
            )}
            <button
              onClick={() => onEdit(agent)}
              className="text-xs text-gray-500 hover:text-primary-400 flex items-center gap-1 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              {missingOperators ? 'Ajouter numéros' : 'Modifier'}
            </button>
          </div>

          {agent.createdAt && (
            <p className="text-gray-600 text-xs mt-0.5">
              Inscrit le {formatDate(agent.createdAt)}
            </p>
          )}
        </div>

        <button
          onClick={handleToggle}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex-shrink-0
            ${agent.active
              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
              : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
            } disabled:opacity-50`}
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" />
            : agent.active ? <><UserX className="w-4 h-4" /> Désactiver</>
            : <><UserCheck className="w-4 h-4" /> Activer</>}
        </button>
      </div>
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
  const [agents,       setAgents]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [showCreate,   setShowCreate]   = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'agent'));
    return onSnapshot(q, (snap) => {
      setAgents(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const toggleAgent = async (uid, active) => {
    await updateDoc(doc(db, 'users', uid), { active, updatedAt: serverTimestamp() });
  };

  const filtered = agents.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.name?.toLowerCase().includes(q) || a.phone?.includes(q);
  });

  const activeCount = agents.filter(a => a.active).length;
  const missingCount = agents.filter(a => !a.operators || Object.keys(a.operators).length === 0).length;

  return (
    <Layout>
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Gestion des agents</h1>
            <p className="text-gray-500 text-sm mt-1">
              {activeCount} actif{activeCount !== 1 ? 's' : ''} sur {agents.length}
            </p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm py-2">
            <Shield className="w-4 h-4" /> Créer un agent
          </button>
        </div>

        {/* Alerte agents sans numéros */}
        {missingCount > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-lg">⚠</span>
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
              <p className="text-white font-bold text-xl">{agents.length - activeCount}</p>
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
            {filtered.map(agent => (
              <AgentCard key={agent.uid} agent={agent}
                onToggle={toggleAgent}
                onEdit={setEditingAgent} />
            ))}
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
    </Layout>
  );
}
