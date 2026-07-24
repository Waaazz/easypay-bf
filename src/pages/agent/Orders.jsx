import React, { useState, useEffect } from 'react';
import {
  CheckCircle, XCircle, ArrowDownCircle, ArrowUpCircle,
  Inbox, TrendingUp, Clock,
} from 'lucide-react';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import { db, auth } from '../../firebase/config';
import { formatCFA, formatDate, formatTxId } from '../../utils/formatters';
import { OPERATORS, AGENT_NUMBERS } from '../../utils/constants';
import OperatorLogo from '../../components/OperatorLogo';

export default function AgentOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(auth.currentUser);
  const [tab, setTab] = useState('completed');

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  useEffect(() => {
    if (!user || user.isAnonymous) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'transactions'),
      where('agentId', '==', user.uid),
      limit(100)
    );

    const unsub = onSnapshot(q, (snap) => {
      const txs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
      setOrders(txs);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  const completed = orders.filter(t => t.status === 'completed');
  const cancelled = orders.filter(t => t.status === 'cancelled');
  const displayed = tab === 'completed' ? completed : cancelled;

  const volumeCompleted = completed.reduce((s, t) => s + t.amount, 0);

  return (
    <Layout>
      <div className="space-y-5 animate-fade-in">
        <div>
          <h1 className="page-title">Mes commandes</h1>
          <p className="text-gray-400 text-sm mt-1">Historique de vos transactions traitées</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card py-3 text-center">
            <p className="text-green-400 font-bold text-xl">{completed.length}</p>
            <p className="text-gray-500 text-xs mt-0.5">Terminées</p>
          </div>
          <div className="card py-3 text-center">
            <p className="text-red-400 font-bold text-xl">{cancelled.length}</p>
            <p className="text-gray-500 text-xs mt-0.5">Annulées</p>
          </div>
          <div className="card py-3 text-center">
            <p className="text-primary-400 font-bold text-lg">{(volumeCompleted / 1000).toFixed(0)}k</p>
            <p className="text-gray-500 text-xs mt-0.5">Volume (FCFA)</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900 rounded-xl p-1 border border-gray-800">
          {[
            { key: 'completed', label: `Terminées (${completed.length})`, icon: CheckCircle },
            { key: 'cancelled', label: `Annulées (${cancelled.length})`, icon: XCircle },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all
                ${tab === key ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="card animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-800 rounded-full" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-800 rounded w-28 mb-2" />
                    <div className="h-2 bg-gray-800 rounded w-20" />
                  </div>
                  <div className="w-16 h-5 bg-gray-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="card text-center py-12">
            <Inbox className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">Aucune commande {tab === 'completed' ? 'terminée' : 'annulée'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map(tx => {
              const isDeposit = tx.type === 'deposit';
              const operator = isDeposit
                ? AGENT_NUMBERS.find(o => o.id === tx.operator)
                : OPERATORS.find(o => o.id === tx.operator);
              return (
                <div key={tx.id} className="card hover:border-gray-700 transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0
                      ${isDeposit ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      {isDeposit
                        ? <ArrowDownCircle className="w-4 h-4 text-green-400" />
                        : <ArrowUpCircle className="w-4 h-4 text-red-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium">
                          {isDeposit ? 'Dépôt' : 'Retrait'}
                        </span>
                        <span className="text-gray-600 text-xs">{formatTxId(tx.id)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {operator && (
                          <span className="text-gray-500 text-xs flex items-center gap-1">
                            <OperatorLogo operator={operator} className="h-3.5" boxed /> {operator.name}
                          </span>
                        )}
                        <span className="text-gray-600 text-xs">•</span>
                        <span className="text-gray-600 text-xs">{tx.platform?.toUpperCase()}</span>
                        <span className="text-gray-600 text-xs">•</span>
                        <span className="text-gray-600 text-xs">{formatDate(tx.updatedAt || tx.createdAt)}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-bold text-sm ${isDeposit ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCFA(tx.amount)}
                      </p>
                      <div className="mt-1">
                        <StatusBadge status={tx.status} />
                      </div>
                    </div>
                  </div>
                  {tx.note && (
                    <p className="text-gray-600 text-xs mt-2 pl-12">Note : {tx.note}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
