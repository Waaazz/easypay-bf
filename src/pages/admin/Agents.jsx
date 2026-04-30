import React, { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  Phone,
  RefreshCw,
  AlertCircle,
  Search,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import Layout from '../../components/Layout';
import { db } from '../../firebase/config';
import { formatDate } from '../../utils/formatters';

function AgentCard({ agent, onToggle }) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    await onToggle(agent.uid, !agent.active);
    setLoading(false);
  };

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
          {agent.createdAt && (
            <p className="text-gray-600 text-xs mt-0.5">
              Inscrit le {formatDate(agent.createdAt)}
            </p>
          )}
        </div>

        <button
          onClick={handleToggle}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
            ${agent.active
              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
              : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'
            } disabled:opacity-50`}
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : agent.active ? (
            <><UserX className="w-4 h-4" /> Désactiver</>
          ) : (
            <><UserCheck className="w-4 h-4" /> Activer</>
          )}
        </button>
      </div>
    </div>
  );
}

function PromoteUserModal({ onClose, onPromote }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePromote = async () => {
    if (!phone.trim()) return;
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const digits = phone.replace(/\D/g, '');
      const formatted = digits.startsWith('226') ? `+${digits}` : `+226${digits}`;

      const q = query(collection(db, 'users'), where('phone', '==', formatted));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError('Aucun utilisateur trouvé avec ce numéro.');
        setLoading(false);
        return;
      }

      const userDoc = snap.docs[0];
      await updateDoc(doc(db, 'users', userDoc.id), {
        role: 'agent',
        active: true,
        updatedAt: serverTimestamp(),
      });

      setSuccess(`${userDoc.data().name || formatted} a été promu agent avec succès.`);
      setPhone('');
      onPromote();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-sm">
        <h3 className="section-title mb-4">Promouvoir en agent</h3>

        <div className="space-y-4">
          <div>
            <label className="label">Numéro de téléphone</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <span className="text-gray-400 text-sm">🇧🇫 +226</span>
                <div className="w-px h-5 bg-gray-700" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="70 00 00 00"
                className="input-field pl-24"
              />
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

          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary flex-1 text-sm">
              Fermer
            </button>
            <button
              onClick={handlePromote}
              disabled={!phone.trim() || loading}
              className="btn-primary flex-1 text-sm"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Promouvoir'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminAgents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showPromote, setShowPromote] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'agent'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setAgents(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const toggleAgent = async (uid, active) => {
    await updateDoc(doc(db, 'users', uid), {
      active,
      updatedAt: serverTimestamp(),
    });
  };

  const filtered = agents.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.name?.toLowerCase().includes(q) || a.phone?.includes(q);
  });

  const activeCount = agents.filter((a) => a.active).length;

  return (
    <Layout>
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Gestion des agents</h1>
            <p className="text-gray-500 text-sm mt-1">
              {activeCount} actif{activeCount > 1 ? 's' : ''} sur {agents.length} agent{agents.length > 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowPromote(true)}
            className="btn-primary text-sm py-2"
          >
            <Shield className="w-4 h-4" />
            Ajouter agent
          </button>
        </div>

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

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou téléphone..."
            className="input-field pl-11"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
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
            <p className="text-gray-600 text-sm mt-1">
              Ajoutez des agents en les promouvant depuis leur compte
            </p>
            <button
              onClick={() => setShowPromote(true)}
              className="btn-primary mt-4"
            >
              Ajouter un agent
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((agent) => (
              <AgentCard key={agent.uid} agent={agent} onToggle={toggleAgent} />
            ))}
          </div>
        )}
      </div>

      {showPromote && (
        <PromoteUserModal
          onClose={() => setShowPromote(false)}
          onPromote={() => {}}
        />
      )}
    </Layout>
  );
}
