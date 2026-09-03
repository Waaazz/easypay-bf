import React from 'react';
import { X, CreditCard, User, UserCog, Calendar, Phone, Timer } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatCFA, formatDate, formatTxId, computeWaitMs } from '../utils/formatters';
import { formatDuration } from '../utils/availability';
import { AGENT_NUMBERS } from '../utils/constants';
import OperatorLogo from './OperatorLogo';

// `agentName`/`superviseurName`/`agentClaimed` sont optionnels — fournis par
// l'admin (via resolveTransactionStaff) pour afficher qui traite la
// transaction et de quel superviseur cet agent dépend. Absents côté client,
// qui n'a pas à voir cette information interne. `showWaitTime` affiche le
// temps d'attente du client (admin/superviseur uniquement).
export default function TransactionDetailModal({ transaction, onClose, agentName, superviseurName, agentClaimed, showWaitTime }) {
  if (!transaction) return null;

  const isDeposit = transaction.type === 'deposit';
  const operator = AGENT_NUMBERS.find((op) => op.id === transaction.operator);

  const rows = [
    { icon: CreditCard, label: 'Type', value: isDeposit ? 'Dépôt' : 'Retrait' },
    { icon: CreditCard, label: 'Montant', value: formatCFA(transaction.amount) },
    { icon: CreditCard, label: 'Plateforme', value: transaction.platform?.toUpperCase() || '—' },
    { icon: CreditCard, label: 'Opérateur', value: (
      <span className="inline-flex items-center gap-1.5">
        <OperatorLogo operator={operator} className="h-4" boxed /> {operator?.name || '—'}
      </span>
    ) },
    ...(transaction.accountId ? [{ icon: User, label: 'ID compte', value: transaction.accountId }] : []),
    ...(agentName && transaction.clientName ? [{ icon: User, label: 'Client', value: transaction.clientName }] : []),
    ...(transaction.phone ? [{ icon: Phone, label: 'Téléphone', value: transaction.phone }] : []),
    ...(agentName ? [{ icon: User, label: agentClaimed ? 'Agent' : 'Agent assigné', value: agentName }] : []),
    ...(superviseurName ? [{ icon: UserCog, label: 'Superviseur', value: superviseurName }] : []),
    ...(showWaitTime ? [{ icon: Timer, label: "Temps d'attente", value: formatDuration(computeWaitMs(transaction)) }] : []),
    { icon: Calendar, label: 'Date', value: formatDate(transaction.createdAt) },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 dark:bg-gray-950/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md card animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-gray-900 dark:text-white font-bold text-lg">Détail transaction</h2>
            <p className="text-gray-500 text-sm">{formatTxId(transaction.id)}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={transaction.status} />
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {rows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3">
              <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-gray-600 dark:text-gray-400 text-sm w-28 flex-shrink-0">{label}</span>
              <span className="text-gray-900 dark:text-white font-medium text-sm truncate">{value}</span>
            </div>
          ))}
        </div>

        {transaction.note && (
          <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm">Note: {transaction.note}</p>
          </div>
        )}
      </div>
    </div>
  );
}
