import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import ClientHeader from '../../components/ClientHeader';
import ClientBottomNav from '../../components/ClientBottomNav';
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

// Historique des transactions créées par ce caissier au guichet — même
// mécanisme que le client (clientId == uid connecté), le caissier étant
// simplement l'utilisateur authentifié au moment de la création.
export default function CaissierHistory() {
  const { transactions, loading } = useClientTransactions();
  const [typeFilter, setTypeFilter] = useState(null);
  const [selectedTx, setSelectedTx] = useState(null);

  const filtered = transactions.filter((tx) => {
    if (typeFilter === 'deposit' && tx.type !== 'deposit') return false;
    if (typeFilter === 'withdrawal' && tx.type !== 'withdrawal') return false;
    if (typeFilter === 'pending' && tx.status !== 'pending' && tx.status !== 'processing') return false;
    if (typeFilter === 'completed' && tx.status !== 'completed') return false;
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #69c522 0%, #3a8015 100%)' }}>
      <ClientHeader />

      <div className="flex-1 mx-4 mb-4 bg-white rounded-3xl shadow-xl shadow-black/10 p-5 overflow-y-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Mes transactions</h1>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide mb-4">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setTypeFilter(f.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 flex-shrink-0
                ${typeFilter === f.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Aucune transaction trouvée</p>
            <p className="text-gray-400 text-sm mt-1">
              {typeFilter ? 'Essayez un autre filtre' : 'Créez votre première transaction depuis l\'onglet Transaction'}
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
      <ClientBottomNav active="historique" />
    </div>
  );
}
