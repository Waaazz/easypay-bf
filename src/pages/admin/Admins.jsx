import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Shield, ShieldCheck, UserCheck, UserX, Mail,
  RefreshCw, Search, CheckCircle, Eye, EyeOff,
  Archive, ArchiveRestore, ChevronDown, ChevronUp, Clock,
} from 'lucide-react';
import Layout from '../../components/Layout';
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
function ArchiveAdminModal({ admin, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);

  const handleArchive = async () => {
    setLoading(true);
    await onConfirm(admin.uid);
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
            <h3 className="text-gray-900 dark:text-white font-semibold">Archiver l'admin adjoint</h3>
            <p className="text-gray-500 text-xs">Réversible — vous pourrez le réactiver à tout moment</p>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-5">
          Voulez-vous archiver <span className="text-gray-900 dark:text-white font-medium">{admin.name}</span> ? Il n'aura plus accès à l'espace admin.
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

// ─── Carte admin ──────────────────────────────────────────────────────────────
function AdminCard({ admin, onToggle, onArchive, isSelf }) {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isPrincipal = admin.isPrincipal !== false;

  const handleToggle = async () => {
    setLoading(true);
    await onToggle(admin.uid, !admin.active);
    setLoading(false);
  };

  return (
    <div className="card hover:border-gray-300 dark:hover:border-gray-700 transition-all">
      <div className="flex items-start gap-3">
        <button onClick={() => setExpanded(v => !v)} className="flex-1 min-w-0 flex items-start gap-3 text-left">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0
            ${admin.active ? 'bg-primary-500/10' : 'bg-gray-100 dark:bg-gray-800'}`}>
            {isPrincipal
              ? <ShieldCheck className={`w-5 h-5 ${admin.active ? 'text-primary-400' : 'text-gray-500'}`} />
              : <Shield className={`w-5 h-5 ${admin.active ? 'text-primary-400' : 'text-gray-500'}`} />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-900 dark:text-white font-semibold truncate">{admin.name || 'Admin'}</span>
              <span className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 flex-shrink-0
                ${isPrincipal ? 'bg-primary-500/15 text-primary-600 dark:text-primary-400' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                {isPrincipal ? 'Principal' : 'Adjoint'}
              </span>
              {isSelf && <span className="text-gray-400 text-xs flex-shrink-0">(vous)</span>}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <StatusDot color={admin.active ? 'bg-green-400' : 'bg-red-400'} label={admin.active ? 'Actif' : 'Inactif'} />
            </div>
            <p className="text-gray-500 text-xs mt-1.5">{admin.email}</p>
          </div>
        </button>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {!isPrincipal && !isSelf && (
            <button onClick={handleToggle} disabled={loading}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all
                ${admin.active
                  ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                  : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
                } disabled:opacity-50`}>
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                : admin.active ? <><UserX className="w-3.5 h-3.5" /> Désactiver</>
                : <><UserCheck className="w-3.5 h-3.5" /> Activer</>}
            </button>
          )}
          <button onClick={() => setExpanded(v => !v)} className="text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 p-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800/60 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 text-xs">
              <Mail className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600 flex-shrink-0" /> {admin.email}
            </div>
            <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 text-xs">
              <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600 flex-shrink-0" />
              {admin.lastLoginAt
                ? `Connecté ${formatRelativeTime(admin.lastLoginAt).toLowerCase()}`
                : 'Jamais connecté'}
            </div>
          </div>

          <SessionLogsPanel uid={admin.uid} name={admin.name} />

          {!isPrincipal && !isSelf && (
            <div className="flex items-center justify-between flex-wrap gap-2">
              <button onClick={() => onArchive(admin)}
                className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 transition-colors">
                <Archive className="w-3 h-3" /> Archiver
              </button>
              {admin.createdAt && (
                <span className="text-gray-400 dark:text-gray-700 text-xs">Créé le {formatDate(admin.createdAt)}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Carte admin archivé ────────────────────────────────────────────────────
function ArchivedAdminCard({ admin, onReactivate }) {
  const [loading, setLoading] = useState(false);
  const handleReactivate = async () => {
    setLoading(true);
    await onReactivate(admin.uid);
    setLoading(false);
  };
  return (
    <div className="card flex items-center gap-4 opacity-75">
      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
        <Archive className="w-5 h-5 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-700 dark:text-gray-300 font-medium text-sm">{admin.name || 'Admin'}</p>
        <p className="text-gray-500 dark:text-gray-600 text-xs">{admin.email}</p>
      </div>
      <button onClick={handleReactivate} disabled={loading}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 disabled:opacity-50 flex-shrink-0">
        {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <><ArchiveRestore className="w-3.5 h-3.5" /> Réactiver</>}
      </button>
    </div>
  );
}

// ─── Modal création d'un admin adjoint ─────────────────────────────────────
function CreateAdjointModal({ onClose }) {
  const { createAdjointAdminAccount } = useAuth();
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');

  const handleCreate = async () => {
    if (!name.trim() || !email.trim() || !password) return;
    if (!email.includes('@')) { setError('Email invalide.'); return; }
    if (password.length < 6) { setError('Le mot de passe doit contenir au moins 6 caractères.'); return; }

    setError(''); setSuccess(''); setLoading(true);

    const result = await createAdjointAdminAccount(name.trim(), email.trim(), password);
    setLoading(false);

    if (result.success) {
      setSuccess(`Compte créé pour ${name.trim()}`);
      setName(''); setEmail(''); setPassword('');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <h3 className="section-title mb-1">Créer un admin adjoint</h3>
        <p className="text-gray-500 text-xs mb-5">
          Il se connecte sur <span className="text-gray-700 dark:text-gray-300">/admin/login</span> avec son email. Il gère les agents, caissiers, superviseurs et transactions, mais ne voit pas le Dashboard et ne peut pas créer d'autres comptes admin.
        </p>

        <div className="space-y-4">
          <div>
            <label className="label">Nom complet</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Ex : Aïcha Ouédraogo" className="input-field" autoFocus />
          </div>

          <div>
            <label className="label">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="ex : aicha@apollonpay.bf" className="input-field" autoCapitalize="none" autoCorrect="off" />
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
                disabled={!name.trim() || !email.trim() || !password || loading}
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
export default function AdminAdmins() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const isPrincipal = userProfile?.isPrincipal !== false;

  const [admins,        setAdmins]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [showCreate,    setShowCreate]    = useState(false);
  const [archivingAdmin, setArchivingAdmin] = useState(null);
  const [showArchived,  setShowArchived]  = useState(false);

  // Un admin adjoint ne doit pas accéder à cette page (ni voir/créer d'autres
  // comptes admin) — redirection immédiate, cohérent avec la restriction déjà
  // appliquée côté règles Firestore.
  useEffect(() => {
    if (userProfile && !isPrincipal) navigate('/admin/transactions', { replace: true });
  }, [userProfile, isPrincipal, navigate]);

  useEffect(() => {
    if (!isPrincipal) return;
    const q = query(collection(db, 'users'), where('role', '==', 'admin'));
    return onSnapshot(q, (snap) => {
      setAdmins(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [isPrincipal]);

  if (!isPrincipal) return null;

  const toggleAdmin = async (uid, active) => {
    await updateDoc(doc(db, 'users', uid), { active, updatedAt: serverTimestamp() });
  };

  const archiveAdmin = async (uid) => {
    await updateDoc(doc(db, 'users', uid), {
      archived: true,
      active: false,
      updatedAt: serverTimestamp(),
    });
  };

  const reactivateAdmin = async (uid) => {
    await updateDoc(doc(db, 'users', uid), {
      archived: false,
      updatedAt: serverTimestamp(),
    });
  };

  const liveAdmins = admins.filter(a => !a.archived);
  const archivedAdmins = admins.filter(a => a.archived);

  const filtered = liveAdmins.filter(a => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q);
  });

  const activeCount = liveAdmins.filter(a => a.active).length;

  return (
    <Layout>
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h1 className="page-title">Gestion des admins</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {activeCount} actif{activeCount !== 1 ? 's' : ''} sur {liveAdmins.length}
              </p>
            </div>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm py-2">
            <ShieldCheck className="w-4 h-4" /> Créer un admin adjoint
          </button>
        </div>

        <p className="text-gray-500 text-sm">
          Un admin adjoint gère les agents, caissiers, superviseurs et transactions comme vous, mais ne voit pas le
          Dashboard et ne peut pas créer d'autres comptes admin — réservé au principal (vous).
        </p>

        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou email..."
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
            <ShieldCheck className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Aucun admin trouvé</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
              Créer un admin adjoint
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((admin) => (
              <AdminCard key={admin.uid} admin={admin}
                onToggle={toggleAdmin}
                onArchive={setArchivingAdmin}
                isSelf={admin.uid === userProfile?.uid} />
            ))}
          </div>
        )}

        {/* Admins archivés */}
        {archivedAdmins.length > 0 && (
          <div>
            <button onClick={() => setShowArchived(v => !v)}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm font-medium transition-colors">
              <Archive className="w-4 h-4" />
              Admins archivés ({archivedAdmins.length})
              {showArchived ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showArchived && (
              <div className="space-y-2 mt-3">
                {archivedAdmins.map(admin => (
                  <ArchivedAdminCard key={admin.uid} admin={admin} onReactivate={reactivateAdmin} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showCreate && <CreateAdjointModal onClose={() => setShowCreate(false)} />}
      {archivingAdmin && (
        <ArchiveAdminModal
          admin={archivingAdmin}
          onClose={() => setArchivingAdmin(null)}
          onConfirm={archiveAdmin}
        />
      )}
    </Layout>
  );
}
