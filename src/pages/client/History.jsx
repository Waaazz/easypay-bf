import React, { useState } from 'react';
import { History as HistoryIcon, AlertCircle, Filter } from 'lucide-react';
import Layout from '../../components/Layout';
import TransactionCard from '../../components/TransactionCard';
import TransactionDetailModal from '../../components/TransactionDetailModal';
import { useClientTransactions } from '../../hooks/useTransactions';

const FILTERS = [
  { label: 'Tout', value: null },
  { label: 'Dépôts', value: 'deposit' },
  { label: 'Retraits', value: 'withdrawal' },
  { label: 'En attente', value: 'pending' },
  { label: 'Terminé', value: 'completed' },
];

export default function History() {
  const { transactions, loading } = useClientTransactions();
  const [typeFilter, setTypeFilter] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [selectedTx, setSelectedTx] = useState(null);

  const filtered = transactions.filter((tx) => {
    if (typeFilter === 'deposit' && tx.type !== 'deposit') return false;
    if (typeFilter === 'withdrawal' && tx.type !== 'withdrawal') return false;
    if (typeFilter === 'pending' && tx.status !== 'pending' && tx.status !== 'processing') return false;
    if (typeFilter === 'completed' && tx.status !== 'completed') return false;
    return true;
  });

  return (
    <Layout>
      <div className="space-y-5 animate-fade-in">
        <div className="flex items-center gap-3">
          <HistoryIcon className="w-7 h-7 text-primary-400" />
          <h1 className="page-title">Historique</h1>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setTypeFilter(f.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0
                ${typeFilter === f.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Summary */}
        {!loading && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Filter className="w-4 h-4" />
            <span>{filtered.length} transaction{filtered.length > 1 ? 's' : ''}</span>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-800 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-800 rounded w-32 mb-2" />
                    <div className="h-3 bg-gray-800 rounded w-24" />
                  </div>
                  <div className="w-24 h-6 bg-gray-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">Aucune transaction trouvée</p>
            <p className="text-gray-600 text-sm mt-1">
              {typeFilter ? 'Essayez un autre filtre' : 'Vous n\'avez pas encore de transactions'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((tx) => (
              <TransactionCard key={tx.id} transaction={tx} onClick={() => setSelectedTx(tx)} />
            ))}
          </div>
        )}
      </div>

      <TransactionDetailModal transaction={selectedTx} onClose={() => setSelectedTx(null)} />
    </Layout>
  );
}
