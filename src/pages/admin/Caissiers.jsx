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
  Wallet, UserCheck, UserX, Phone,
  RefreshCw, Search, CheckCircle, Eye, EyeOff,
  Archive, ArchiveRestore, ChevronDown, ChevronUp, Clock,
} from 'lucide-react';
import Layout from '../../components/Layout';
import UsernameAssign from '../../components/UsernameAssign';
import SessionLogsPanel from '../../components/SessionLogsPanel';
import { db } from '../../firebase/config';
import { useAuth } from '../../hooks/useAuth';
import { formatDate, formatRelativeTime } from '../../utils/formatters';

// ─── Petit indicateur de statut (point coloré + texte) ───────────────────────
function StatusDot({ color, label }) {
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span className={`w-2 h-2 rounded-full ring-1 ring-white/10 ${color} flex-shrink-0`} />
      {label}
    </span>
  );
}

// ─── Modal confirmation archivage ────────────────────────────────────────────
function ArchiveCaissierModal({ caissier, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);

  const handleArchive = async () => {
    setLoading(true);
    await onConfirm(caissier.uid);
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
            <h3 className="text-gray-900 dark:text-white font-semibold">Archiver le caissier</h3>
            <p className="text-gray-500 text-xs">Réversible — vous pourrez le réactiver à tout moment</p>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-5">
          Voulez-vous archiver <span className="text-gray-900 dark:text-white font-medium">{caissier.name}</span> ? Il n'apparaîtra plus dans la liste active.
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

// ─── Carte caissier ───────────────────────────────────────────────────────────
function CaissierCard({ caissier, onToggle, onArchive }) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    await onToggle(caissier.uid, !caissier.active);
    setLoading(false);
  };

  return (
    <div className="card hover:border-gray-300 dark:hover:border-gray-700 transition-all">
      <div className="flex items-start gap-3">
        <button onClick={() => setExpanded(v => !v)} className="flex-1 min-w-0 flex items-start gap-3 text-left">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0
            ${caissier.active ? 'bg-primary-500/10' : 'bg-gray-100 dark:bg-gray-800'}`}>
            <Wallet className={`w-5 h-5 ${caissier.active ? 'text-primary-400' : 'text-gray-500'}`} />
          </div>

          <div className="flex-1 min-w-0">
            <span className="text-gray-900 dark:text-white font-semibold truncate block">{caissier.name || 'Caissier'}</span>
            <div className="flex items-center gap-3 mt-1">
              <StatusDot color={caissier.active ? 'bg-green-400' : 'bg-red-400'} label={caissier.active ? 'Actif' : 'Inactif'} />
            </div>
            <p className="text-gray-500 text-xs mt-1.5">{caissier.phone}</p>
          </div>
        </button>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <button onClick={handleToggle} disabled={loading}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all
              ${caissier.active
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
              } disabled:opacity-50`}>
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              : caissier.active ? <><UserX className="w-3.5 h-3.5" /> Désactiver</>
              : <><UserCheck className="w-3.5 h-3.5" /> Activer</>}
          </button>
          <button onClick={() => setExpanded(v => !v)} className="text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 p-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800/60 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 text-xs">
              <Phone className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600 flex-shrink-0" /> {caissier.phone}
            </div>
            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 text-xs">
              <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600 flex-shrink-0" />
              {caissier.lastLoginAt
                ? `Connecté ${formatRelativeTime(caissier.lastLoginAt).toLowerCase()}`
                : 'Jamais connecté'}
            </div>
          </div>

          <UsernameAssign uid={caissier.uid} role="caissier" username={caissier.username} />

          <SessionLogsPanel uid={caissier.uid} name={caissier.name} />

          <div className="flex items-center justify-between flex-wrap gap-2">
            <button onClick={() => onArchive(caissier)}
              className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 transition-colors">
              <Archive className="w-3 h-3" /> Archiver
            </button>
            {caissier.createdAt && (
              <span className="text-gray-400 dark:text-gray-700 text-xs">Inscrit le {formatDate(caissier.createdAt)}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Carte caissier archivé ────────────────────────────────────────────────────
function ArchivedCaissierCard({ caissier, onReactivate }) {
  const [loading, setLoading] = useState(false);
  const handleReactivate = async () => {
    setLoading(true);
    await onReactivate(caissier.uid);
    setLoading(false);
  };
  return (
    <div className="card flex items-center gap-4 opacity-75">
      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
        <Archive className="w-5 h-5 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-700 dark:text-gray-300 font-medium text-sm">{caissier.name || 'Caissier'}</p>
        <p className="text-gray-500 dark:text-gray-600 text-xs">{caissier.phone}</p>
      </div>
      <button onClick={handleReactivate} disabled={loading}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 disabled:opacity-50 flex-shrink-0">
        {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <><ArchiveRestore className="w-3.5 h-3.5" /> Réactiver</>}
      </button>
    </div>
  );
}

// ─── Modal création d'un nouveau caissier ──────────────────────────────────────
function CreateCaissierModal({ onClose }) {
  const { createCaissierAccount } = useAuth();
  const [name,      setName]      = useState('');
  const [username,  setUsername]  = useState('');
  const [phone,     setPhone]     = useState('');
  const [password,  setPassword]  = useState('');
  const [showPwd,   setShowPwd]   = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');

  const handleCreate = async () => {
    if (!name.trim() || !username.trim() || !phone.trim() || !password) return;
    if (username.trim().length < 3) { setError("Nom d'utilisateur trop court (3 caractères minimum)."); return; }
    if (phone.replace(/\D/g, '').length < 8) { setError('Numéro de téléphone invalide.'); return; }
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }

    setError(''); setSuccess(''); setLoading(true);

    const result = await createCaissierAccount(name.trim(), username, phone, password);
    setLoading(false);

    if (result.success) {
      setSuccess(`Compte créé pour ${name.trim()}`);
      setName(''); setUsername(''); setPhone(''); setPassword('');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <h3 className="section-title mb-1">Créer un compte caissier</h3>
        <p className="text-gray-500 text-xs mb-5">
          Le caissier se connecte sur <span className="text-gray-700 dark:text-gray-300">/caissier/login</span> avec son nom d'utilisateur.
        </p>

        <div className="space-y-4">
          <div>
            <label className="label">Nom complet</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex : Aïcha Ouédraogo" className="input-field" autoFocus />
          </div>

          <div>
            <label className="label">Nom d'utilisateur (connexion)</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="ex : aicha.o" className="input-field" autoCapitalize="none" autoCorrect="off" />
          </div>

          <div>
            <label className="label">Numéro de téléphone (contact)</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-gray-400 text-sm">🇧🇫 +226</span>
                <div className="w-px h-5 bg-gray-300 dark:bg-gray-700" />
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
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
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
                disabled={!name.trim() || !username.trim() || !phone.trim() || !password || loading}
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
export default function AdminCaissiers() {
  const [caissiers,      setCaissiers]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [showCreate,     setShowCreate]     = useState(false);
  const [archivingCaissier, setArchivingCaissier] = useState(null);
  const [showArchived,   setShowArchived]   = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'caissier'));
    return onSnapshot(q, (snap) => {
      setCaissiers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
      setLoading(false);
    });
  }, []);

  const toggleCaissier = async (uid, active) => {
    await updateDoc(doc(db, 'users', uid), { active, updatedAt: serverTimestamp() });
  };

  const archiveCaissier = async (uid) => {
    await updateDoc(doc(db, 'users', uid), {
      archived: true,
      active: false,
      updatedAt: serverTimestamp(),
    });
  };

  const reactivateCaissier = async (uid) => {
    await updateDoc(doc(db, 'users', uid), {
      archived: false,
      updatedAt: serverTimestamp(),
    });
  };

  const liveCaissiers = caissiers.filter(c => !c.archived);
  const archivedCaissiers = caissiers.filter(c => c.archived);

  const filtered = liveCaissiers.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.phone?.includes(q);
  });

  const activeCount = liveCaissiers.filter(c => c.active).length;

  return (
    <Layout>
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h1 className="page-title">Gestion des caissiers</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {activeCount} actif{activeCount !== 1 ? 's' : ''} sur {liveCaissiers.length}
              </p>
            </div>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm py-2">
            <Wallet className="w-4 h-4" /> Créer un caissier
          </button>
        </div>

        <p className="text-gray-500 text-sm">
          Un caissier crée des dépôts/retraits au guichet pour des clients physiques — ces transactions sont ensuite traitées par un agent comme n'importe quelle autre.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-gray-500 text-xs">Caissiers actifs</p>
              <p className="text-gray-900 dark:text-white font-bold text-xl">{activeCount}</p>
            </div>
          </div>
          <div className="card flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
              <UserX className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-gray-500 text-xs">Caissiers inactifs</p>
              <p className="text-gray-900 dark:text-white font-bold text-xl">{liveCaissiers.length - activeCount}</p>
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
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-32 mb-2" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-24" />
                  </div>
                  <div className="w-24 h-8 bg-gray-200 dark:bg-gray-800 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-12">
            <Wallet className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Aucun caissier trouvé</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
              Créer un caissier
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((caissier) => (
              <CaissierCard key={caissier.uid} caissier={caissier}
                onToggle={toggleCaissier}
                onArchive={setArchivingCaissier} />
            ))}
          </div>
        )}

        {/* Caissiers archivés */}
        {archivedCaissiers.length > 0 && (
          <div>
            <button onClick={() => setShowArchived(v => !v)}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm font-medium transition-colors">
              <Archive className="w-4 h-4" />
              Caissiers archivés ({archivedCaissiers.length})
              {showArchived ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showArchived && (
              <div className="space-y-2 mt-3">
                {archivedCaissiers.map(caissier => (
                  <ArchivedCaissierCard key={caissier.uid} caissier={caissier} onReactivate={reactivateCaissier} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showCreate && <CreateCaissierModal onClose={() => setShowCreate(false)} />}
      {archivingCaissier && (
        <ArchiveCaissierModal
          caissier={archivingCaissier}
          onClose={() => setArchivingCaissier(null)}
          onConfirm={archiveCaissier}
        />
      )}
    </Layout>
  );
}
