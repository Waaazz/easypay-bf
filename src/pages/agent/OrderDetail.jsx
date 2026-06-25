import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  RefreshCw,
  Phone,
  User,
  Calendar,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import { db } from '../../firebase/config';
import { useTransactionActions } from '../../hooks/useTransactions';
import { formatCFA, formatDate, formatTxId } from '../../utils/formatters';
import { OPERATORS, AGENT_NUMBERS } from '../../utils/constants';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { acceptOrder, completeOrder, cancelOrder } = useTransactionActions();

  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(
      doc(db, 'transactions', id),
      (snap) => {
        if (snap.exists()) {
          setTransaction({ id: snap.id, ...snap.data() });
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [id]);

  const handleAccept = async () => {
    setActionLoading(true);
    const result = await acceptOrder(id);
    setActionLoading(false);
    if (!result.success) setError(result.error);
  };

  const handleComplete = async () => {
    setActionLoading(true);
    const result = await completeOrder(id);
    setActionLoading(false);
    if (!result.success) setError(result.error);
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) return;
    setActionLoading(true);
    const result = await cancelOrder(id, cancelReason);
    setActionLoading(false);
    if (!result.success) setError(result.error);
  };

  const isDeposit = transaction?.type === 'deposit';
  const operator = isDeposit
    ? AGENT_NUMBERS.find(o => o.id === transaction?.operator)
    : OPERATORS.find(o => o.id === transaction?.operator);
  const isAwaitingConfirm = transaction?.status === 'awaiting_confirmation';

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!transaction) {
    return (
      <Layout>
        <div className="card text-center py-12">
          <p className="text-gray-400">Transaction introuvable</p>
          <button onClick={() => navigate('/agent')} className="btn-primary mt-4">
            Retour
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-lg mx-auto animate-fade-in space-y-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/agent')}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="page-title">Détail commande</h1>
            <p className="text-gray-500 text-sm">{formatTxId(transaction.id)}</p>
          </div>
          <div className="ml-auto">
            <StatusBadge status={transaction.status} />
          </div>
        </div>

        <div className="card space-y-4">

          {/* Alerte paiement envoyé */}
          {isAwaitingConfirm && (
            <div className="bg-purple-500/15 border border-purple-500/30 rounded-xl px-4 py-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-purple-300 text-sm font-semibold mb-0.5">Paiement annoncé par le client</p>
                <p className="text-purple-400 text-xs">
                  Le client dit avoir envoyé {formatCFA(transaction.amount)} depuis le numéro{' '}
                  <span className="font-bold">+226 {transaction.clientPhone}</span> via {operator?.name}.
                  Vérifiez votre compte mobile money avant d'accepter.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            {[
              { icon: CreditCard, label: 'Type',      value: isDeposit ? 'Dépôt' : 'Retrait' },
              { icon: CreditCard, label: 'Montant',   value: formatCFA(transaction.amount) },
              { icon: CreditCard, label: 'Plateforme',value: transaction.platform?.toUpperCase() },
              { icon: User,       label: 'ID compte', value: transaction.accountId },
              { icon: CreditCard, label: 'Opérateur', value: `${operator?.logo || ''} ${operator?.name || '—'}` },
              isDeposit
                ? { icon: Phone, label: 'N° client',  value: `+226 ${transaction.clientPhone || '—'}` }
                : { icon: Phone, label: 'N° Orange',  value: `+226 ${transaction.phone || '—'}` },
              ...(!isDeposit ? [
                { icon: User,       label: 'Titulaire',  value: transaction.accountName || '—' },
                { icon: CreditCard, label: 'Code retrait', value: transaction.withdrawCode || '—' },
              ] : []),
              { icon: User,     label: 'Client',     value: transaction.clientName || 'Inconnu' },
              { icon: Calendar, label: 'Date',        value: formatDate(transaction.createdAt) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3">
                <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="text-gray-400 text-sm w-28 flex-shrink-0">{label}</span>
                <span className="text-white font-medium text-sm">{value}</span>
              </div>
            ))}
          </div>

          {transaction.note && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">Note: {transaction.note}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        {(transaction.status === 'pending' || isAwaitingConfirm) && (
          <div className="card space-y-3">
            <h3 className="text-white font-semibold">Actions</h3>
            <button onClick={handleAccept} disabled={actionLoading} className="btn-primary w-full">
              {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : (
                <><CheckCircle className="w-4 h-4" /> {isAwaitingConfirm ? 'Vérifier et Accepter' : 'Accepter la commande'}</>
              )}
            </button>
            <button onClick={() => setShowCancel(!showCancel)} className="btn-danger w-full">
              <XCircle className="w-4 h-4" /> Annuler la commande
            </button>
          </div>
        )}

        {transaction.status === 'processing' && (
          <div className="card space-y-3">
            <h3 className="text-white font-semibold">Actions</h3>
            <button onClick={handleComplete} disabled={actionLoading} className="btn-primary w-full">
              {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : (
                <><CheckCircle className="w-4 h-4" /> Marquer comme terminé</>
              )}
            </button>
            <button onClick={() => setShowCancel(!showCancel)} className="btn-danger w-full">
              <XCircle className="w-4 h-4" /> Annuler
            </button>
          </div>
        )}

        {showCancel && (
          <div className="card space-y-3">
            <label className="label">Raison de l'annulation</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Expliquez pourquoi vous annulez cette commande..."
              className="input-field resize-none h-24"
            />
            <button
              onClick={handleCancel}
              disabled={!cancelReason.trim() || actionLoading}
              className="btn-danger w-full"
            >
              Confirmer l'annulation
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
