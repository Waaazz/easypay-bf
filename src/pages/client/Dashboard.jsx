import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import Layout from '../../components/Layout';
import TransactionCard from '../../components/TransactionCard';
import { useClientTransactions } from '../../hooks/useTransactions';
import { formatCFA } from '../../utils/formatters';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-gray-500 text-xs">{label}</p>
        <p className="text-white font-bold text-lg">{value}</p>
      </div>
    </div>
  );
}

export default function ClientDashboard() {
  const userProfile = null;
  const { transactions, loading } = useClientTransactions();

  const completedTx = transactions.filter((t) => t.status === 'completed');
  const pendingTx = transactions.filter((t) => t.status === 'pending' || t.status === 'processing');

  const totalDeposited = completedTx
    .filter((t) => t.type === 'deposit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWithdrawn = completedTx
    .filter((t) => t.type === 'withdrawal')
    .reduce((sum, t) => sum + t.amount, 0);

  const recentTransactions = transactions.slice(0, 5);

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome */}
        <div>
          <h1 className="page-title">
            Bonjour, {userProfile?.name?.split(' ')[0] || 'Client'} 👋
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Gérez vos dépôts et retraits facilement
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Link to="/deposit">
            <button className="w-full bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white rounded-2xl p-5 transition-all duration-200 shadow-lg shadow-primary-900/30 active:scale-95">
              <ArrowDownCircle className="w-8 h-8 mb-3" />
              <p className="font-bold text-lg">Dépôt</p>
              <p className="text-primary-200 text-xs mt-0.5">Recharger votre compte</p>
            </button>
          </Link>
          <Link to="/withdrawal">
            <button className="w-full bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white rounded-2xl p-5 border border-gray-700 transition-all duration-200 active:scale-95">
              <ArrowUpCircle className="w-8 h-8 mb-3 text-red-400" />
              <p className="font-bold text-lg">Retrait</p>
              <p className="text-gray-400 text-xs mt-0.5">Retirer vos gains</p>
            </button>
          </Link>
        </div>

        {/* Pending banner */}
        {pendingTx.length > 0 && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <div>
              <p className="text-yellow-400 font-medium text-sm">
                {pendingTx.length} transaction{pendingTx.length > 1 ? 's' : ''} en attente
              </p>
              <p className="text-yellow-400/70 text-xs">
                Un agent va traiter votre demande prochainement
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            icon={TrendingUp}
            label="Total déposé"
            value={formatCFA(totalDeposited)}
            color="bg-green-500/10 text-green-400"
          />
          <StatCard
            icon={ArrowUpCircle}
            label="Total retiré"
            value={formatCFA(totalWithdrawn)}
            color="bg-red-500/10 text-red-400"
          />
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Transactions récentes</h2>
            <Link
              to="/history"
              className="text-primary-400 text-sm hover:text-primary-300 transition-colors"
            >
              Voir tout
            </Link>
          </div>

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
                    <div className="w-24 h-6 bg-gray-800 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="card text-center py-10">
              <AlertCircle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Aucune transaction</p>
              <p className="text-gray-600 text-sm mt-1">
                Commencez par effectuer un dépôt
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <TransactionCard key={tx.id} transaction={tx} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
