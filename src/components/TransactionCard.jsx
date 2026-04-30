import React from 'react';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { formatCFA, formatRelativeTime, formatTxId } from '../utils/formatters';
import { OPERATORS } from '../utils/constants';

export default function TransactionCard({ transaction, onClick }) {
  const isDeposit = transaction.type === 'deposit';
  const operator = OPERATORS.find((op) => op.id === transaction.operator);

  return (
    <div
      className="card hover:border-gray-700 transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0
            ${isDeposit ? 'bg-green-500/10' : 'bg-red-500/10'}`}
        >
          {isDeposit ? (
            <ArrowDownCircle className="w-6 h-6 text-green-400" />
          ) : (
            <ArrowUpCircle className="w-6 h-6 text-red-400" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-white">
              {isDeposit ? 'Dépôt' : 'Retrait'}
            </span>
            {operator && (
              <span className="text-xs text-gray-400">• {operator.name}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{formatTxId(transaction.id)}</span>
            <span className="text-xs text-gray-600">•</span>
            <span className="text-xs text-gray-500">
              {formatRelativeTime(transaction.createdAt)}
            </span>
          </div>
        </div>

        {/* Amount & Status */}
        <div className="text-right flex-shrink-0">
          <p
            className={`font-bold text-lg ${
              isDeposit ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {isDeposit ? '+' : '-'}{formatCFA(transaction.amount)}
          </p>
          <div className="mt-1">
            <StatusBadge status={transaction.status} />
          </div>
        </div>
      </div>
    </div>
  );
}
