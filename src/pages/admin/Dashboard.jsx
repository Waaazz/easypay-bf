import React, { useMemo } from 'react';
import {
  TrendingUp,
  Users,
  ArrowDownCircle,
  ArrowUpCircle,
  Activity,
  DollarSign,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import Layout from '../../components/Layout';
import { useAdminTransactions } from '../../hooks/useTransactions';
import { formatCFA } from '../../utils/formatters';

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-500 text-xs">{label}</p>
        <p className="text-white font-bold text-xl mt-0.5 truncate">{value}</p>
        {sub && <p className="text-gray-600 text-xs mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 shadow-xl">
        <p className="text-gray-400 text-xs mb-2">{label}</p>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-white text-sm font-medium">{formatCFA(p.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function AdminDashboard() {
  const { transactions, loading } = useAdminTransactions();

  const stats = useMemo(() => {
    const completed = transactions.filter((t) => t.status === 'completed');
    const pending = transactions.filter((t) => ['pending', 'awaiting_confirmation', 'processing'].includes(t.status));
    const deposits = completed.filter((t) => t.type === 'deposit');
    const withdrawals = completed.filter((t) => t.type === 'withdrawal');
    const agents = new Set(transactions.filter((t) => t.agentId).map((t) => t.agentId));

    return {
      total: transactions.length,
      pending: pending.length,
      completed: completed.length,
      depositVolume: deposits.reduce((s, t) => s + t.amount, 0),
      withdrawalVolume: withdrawals.reduce((s, t) => s + t.amount, 0),
      agentCount: agents.size,
    };
  }, [transactions]);

  // Chart data: last 7 days
  const chartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      const label = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });

      const dayTx = transactions.filter((t) => {
        if (!t.createdAt) return false;
        const txDate = t.createdAt.toDate ? t.createdAt.toDate() : new Date(t.createdAt);
        return txDate.toISOString().split('T')[0] === key && t.status === 'completed';
      });

      days.push({
        name: label,
        Dépôts: dayTx.filter((t) => t.type === 'deposit').reduce((s, t) => s + t.amount, 0),
        Retraits: dayTx.filter((t) => t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0),
      });
    }
    return days;
  }, [transactions]);

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="page-title">Administration</h1>
          <p className="text-gray-400 text-sm mt-1">Vue d'ensemble de la plateforme</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            icon={Activity}
            label="Total transactions"
            value={stats.total}
            sub={`${stats.pending} en attente`}
            color="bg-primary-500/10 text-primary-400"
          />
          <StatCard
            icon={ArrowDownCircle}
            label="Volume dépôts"
            value={formatCFA(stats.depositVolume)}
            sub="transactions complétées"
            color="bg-green-500/10 text-green-400"
          />
          <StatCard
            icon={ArrowUpCircle}
            label="Volume retraits"
            value={formatCFA(stats.withdrawalVolume)}
            sub="transactions complétées"
            color="bg-red-500/10 text-red-400"
          />
          <StatCard
            icon={TrendingUp}
            label="Transactions complétées"
            value={stats.completed}
            color="bg-blue-500/10 text-blue-400"
          />
          <StatCard
            icon={Users}
            label="Agents actifs"
            value={stats.agentCount}
            color="bg-purple-500/10 text-purple-400"
          />
          <StatCard
            icon={DollarSign}
            label="Volume total"
            value={formatCFA(stats.depositVolume + stats.withdrawalVolume)}
            color="bg-yellow-500/10 text-yellow-400"
          />
        </div>

        {/* Chart */}
        <div className="card">
          <h2 className="section-title mb-5">Volume par jour (7 derniers jours)</h2>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                <Bar dataKey="Dépôts" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Retraits" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent transactions summary */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Transactions récentes</h2>
            <a href="/admin/transactions" className="text-primary-400 text-sm hover:text-primary-300">
              Voir tout
            </a>
          </div>
          <div className="space-y-2">
            {loading ? (
              [1,2,3].map(i => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl animate-pulse">
                  <div className="w-8 h-8 bg-gray-700 rounded-full" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-700 rounded w-40 mb-1" />
                    <div className="h-2 bg-gray-700 rounded w-24" />
                  </div>
                </div>
              ))
            ) : (
              transactions.slice(0, 5).map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center
                    ${tx.type === 'deposit' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    {tx.type === 'deposit'
                      ? <ArrowDownCircle className="w-4 h-4 text-green-400" />
                      : <ArrowUpCircle className="w-4 h-4 text-red-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {tx.clientName || 'Client'} — {tx.type === 'deposit' ? 'Dépôt' : 'Retrait'}
                    </p>
                    <p className="text-gray-500 text-xs">{formatCFA(tx.amount)}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full
                    ${tx.status === 'completed'             ? 'text-green-400 bg-green-400/10'
                    : tx.status === 'pending'               ? 'text-yellow-400 bg-yellow-400/10'
                    : tx.status === 'awaiting_confirmation' ? 'text-purple-400 bg-purple-400/10'
                    : tx.status === 'processing'            ? 'text-blue-400 bg-blue-400/10'
                    : 'text-red-400 bg-red-400/10'}`}>
                    {tx.status === 'completed'             ? 'Terminé'
                      : tx.status === 'pending'               ? 'Attente'
                      : tx.status === 'awaiting_confirmation' ? 'Paiement envoyé'
                      : tx.status === 'processing'            ? 'En cours'
                      : 'Annulé'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
