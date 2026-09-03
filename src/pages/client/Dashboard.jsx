import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  Clock,
  AlertCircle,
  LogOut,
} from 'lucide-react';
import ClientHeader from '../../components/ClientHeader';
import ClientBottomNav from '../../components/ClientBottomNav';
import TransactionCard from '../../components/TransactionCard';
import TransactionDetailModal from '../../components/TransactionDetailModal';
import { useClientTransactions } from '../../hooks/useTransactions';
import { useAuth } from '../../hooks/useAuth';
import { formatCFA } from '../../utils/formatters';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-gray-500 text-xs">{label}</p>
        <p className="text-gray-900 font-bold text-lg">{value}</p>
      </div>
    </div>
  );
}

export default function ClientDashboard() {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const { transactions, loading } = useClientTransactions();
  const [selectedTx, setSelectedTx] = useState(null);

  const completedTx = transactions.filter((t) => t.status === 'completed');
  const pendingTx = transactions.filter((t) => t.status === 'pending' || t.status === 'processing');

  const totalDeposited = completedTx
    .filter((t) => t.type === 'deposit')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWithdrawn = completedTx
    .filter((t) => t.type === 'withdrawal')
    .reduce((sum, t) => sum + t.amount, 0);

  const recentTransactions = transactions.slice(0, 5);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #69c522 0%, #3a8015 100%)' }}>
      <ClientHeader />

      <div className="flex-1 mx-4 mb-4 bg-white rounded-3xl shadow-xl shadow-black/10 p-5 space-y-5 overflow-y-auto">
        {/* Identité + déconnexion */}
        <div className="border border-gray-200 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-gray-900">
              Bonjour, {userProfile?.name?.split(' ')[0] || 'Client'} 👋
            </p>
            <p className="text-gray-500 text-sm">{userProfile?.phone}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-red-500 hover:text-red-600 text-sm font-semibold flex-shrink-0"
          >
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          <Link to="/deposit">
            <button className="w-full bg-gradient-to-br from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white rounded-2xl p-5 transition-all duration-200 shadow-lg shadow-primary-900/20 active:scale-95">
              <ArrowDownCircle className="w-8 h-8 mb-3" />
              <p className="font-bold text-lg">Dépôt</p>
              <p className="text-primary-100 text-xs mt-0.5">Recharger votre compte</p>
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
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <div>
              <p className="text-yellow-700 font-medium text-sm">
                {pendingTx.length} transaction{pendingTx.length > 1 ? 's' : ''} en attente
              </p>
              <p className="text-yellow-600 text-xs">
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
            color="bg-green-100 text-green-600"
          />
          <StatCard
            icon={ArrowUpCircle}
            label="Total retiré"
            value={formatCFA(totalWithdrawn)}
            color="bg-red-100 text-red-600"
          />
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Transactions récentes</h2>
            <Link
              to="/history"
              className="text-primary-700 text-sm hover:text-primary-800 transition-colors"
            >
              Voir tout
            </Link>
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
                    <div className="w-24 h-6 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-10">
              <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Aucune transaction</p>
              <p className="text-gray-400 text-sm mt-1">
                Commencez par effectuer un dépôt
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <TransactionCard key={tx.id} transaction={tx} onClick={() => setSelectedTx(tx)} />
              ))}
            </div>
          )}
        </div>
      </div>

      <TransactionDetailModal transaction={selectedTx} onClose={() => setSelectedTx(null)} />
      <ClientBottomNav active="compte" />
    </div>
  );
}
