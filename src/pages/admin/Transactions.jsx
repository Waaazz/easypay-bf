import React, { useState, useEffect } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
  AlertCircle,
} from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import { useAdminTransactions } from '../../hooks/useTransactions';
import { formatCFA, formatDate, formatTxId } from '../../utils/formatters';
import { OPERATORS, AGENT_NUMBERS } from '../../utils/constants';

const STATUS_FILTERS = [
  { label: 'Tout', value: null },
  { label: 'En attente', value: 'pending' },
  { label: 'Paiement envoyé', value: 'awaiting_confirmation' },
  { label: 'En cours', value: 'processing' },
  { label: 'Terminé', value: 'completed' },
  { label: 'Annulé', value: 'cancelled' },
];

const TYPE_FILTERS = [
  { label: 'Tous types', value: null },
  { label: 'Dépôts', value: 'deposit' },
  { label: 'Retraits', value: 'withdrawal' },
];

// Opérateurs réellement utilisés dans les transactions (AGENT_NUMBERS couvre
// à la fois les dépôts et le seul opérateur de retrait, Orange Money — pas
// besoin de fusionner avec OPERATORS qui contient des entrées jamais produites
// par l'app et qui dupliquaient certains noms).
const ALL_OPERATORS = [
  { label: 'Tous', value: null },
  ...AGENT_NUMBERS.map(o => ({ label: `${o.logo} ${o.name}`, value: o.id })),
];

// Badge opérateur coloré
function OperatorBadge({ operator }) {
  if (!operator) return null;
  const colors = {
    orange:  'bg-orange-500/15 text-orange-400 border-orange-500/20',
    telmob:  'bg-red-500/15 text-red-400 border-red-500/20',
    telecel: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    moov:    'bg-blue-600/15 text-blue-300 border-blue-600/20',
    coris:   'bg-green-600/15 text-green-400 border-green-600/20',
    wave:    'bg-sky-500/15 text-sky-400 border-sky-500/20',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colors[operator.id] || 'bg-gray-800 text-gray-400 border-gray-700'}`}>
      {operator.logo} {operator.name}
    </span>
  );
}

export default function AdminTransactions({ initialType = null }) {
  const { transactions, loading } = useAdminTransactions();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [operatorFilter, setOperatorFilter] = useState(null);

  // Les liens "Transactions / Dépôts / Retraits" pointent vers ce même
  // composant avec juste un `initialType` différent ; React ne le remonte
  // pas lors d'une navigation interne, donc on resynchronise explicitement
  // le filtre à chaque changement de route au lieu de compter sur la valeur
  // initiale de useState (qui n'est appliquée qu'au tout premier montage).
  useEffect(() => {
    setTypeFilter(initialType);
  }, [initialType]);

  const filtered = transactions.filter((tx) => {
    if (statusFilter && tx.status !== statusFilter) return false;
    if (typeFilter && tx.type !== typeFilter) return false;
    if (operatorFilter && tx.operator !== operatorFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        tx.clientName?.toLowerCase().includes(q) ||
        tx.phone?.includes(q) ||
        tx.id?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalVolume = filtered
    .filter((t) => t.status === 'completed')
    .reduce((s, t) => s + t.amount, 0);

  return (
    <Layout>
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
          <h1 className="page-title">
            {initialType === 'deposit' ? 'Dépôts' : initialType === 'withdrawal' ? 'Retraits' : 'Transactions'}
          </h1>
          <span className="text-gray-500 text-sm">{filtered.length} résultats</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par client, téléphone, ID..."
            className="input-field pl-11"
          />
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {STATUS_FILTERS.map((f) => (
              <button key={f.label} onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0
                  ${statusFilter === f.value ? 'bg-primary-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {TYPE_FILTERS.map((f) => (
              <button key={f.label} onClick={() => setTypeFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0
                  ${typeFilter === f.value ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {ALL_OPERATORS.map((f) => (
              <button key={f.label} onClick={() => setOperatorFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0
                  ${operatorFilter === f.value ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Volume summary */}
        {!loading && filtered.length > 0 && (
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-primary-400 text-sm">Volume complété</span>
            <span className="text-primary-400 font-bold">{formatCFA(totalVolume)}</span>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="card animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-800 rounded-full" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-800 rounded w-32 mb-1.5" />
                    <div className="h-2 bg-gray-800 rounded w-24" />
                  </div>
                  <div className="w-20 h-6 bg-gray-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-12">
            <AlertCircle className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-400 font-medium">Aucune transaction</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((tx) => {
              const isDeposit = tx.type === 'deposit';
              const operator = isDeposit
                ? AGENT_NUMBERS.find(o => o.id === tx.operator)
                : OPERATORS.find(o => o.id === tx.operator);
              const phone = isDeposit ? tx.clientPhone : tx.phone;
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-medium truncate">
                          {tx.clientName || 'Client'}
                        </span>
                        <span className="text-gray-600 text-xs">{formatTxId(tx.id)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {operator && <OperatorBadge operator={operator} />}
                        {phone && <span className="text-gray-500 text-xs">{phone}</span>}
                        <span className="text-gray-600 text-xs">•</span>
                        <span className="text-gray-600 text-xs">{tx.platform?.toUpperCase()}</span>
                        <span className="text-gray-600 text-xs">•</span>
                        <span className="text-gray-600 text-xs">{formatDate(tx.createdAt)}</span>
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
                    <p className="text-gray-500 text-xs mt-2 pl-12">Note : {tx.note}</p>
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
