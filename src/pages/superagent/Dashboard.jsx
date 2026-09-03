import React, { useState, useMemo } from 'react';
import {
  Users, Wifi, WifiOff, Clock, Timer, Download, RefreshCw, BellRing,
  ArrowDownCircle, ArrowUpCircle, AlertTriangle, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import OperatorLogo from '../../components/OperatorLogo';
import { useAuth } from '../../hooks/useAuth';
import { useSuperAgentTeam, useSuperAgentTransactions, useTeamAvailabilityLogs } from '../../hooks/useTransactions';
import { computeUnavailableDuration, formatDuration } from '../../utils/availability';
import { formatCFA, formatRelativeTime, formatDate, formatTxId, computeWaitMs } from '../../utils/formatters';
import { AGENT_NUMBERS } from '../../utils/constants';
import {
  isNotificationSupported, getNotificationPermission, requestNotificationPermission,
} from '../../utils/notifications';

const HISTORY_STATUS_FILTERS = [
  { label: 'Tout', value: null },
  { label: 'En attente', value: 'pending' },
  { label: 'Paiement envoyé', value: 'awaiting_confirmation' },
  { label: 'En cours', value: 'processing' },
  { label: 'Terminé', value: 'completed' },
  { label: 'Annulé', value: 'cancelled' },
];

const PERIOD_FILTERS = [
  { label: "Aujourd'hui", value: 'today' },
  { label: '7 derniers jours', value: '7d' },
  { label: '30 derniers jours', value: '30d' },
];

function periodStartDate(period) {
  const now = new Date();
  if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d = new Date(now);
  d.setDate(d.getDate() - (period === '7d' ? 7 : 30));
  return d;
}

function StatusDot({ color, label }) {
  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span className={`w-2 h-2 rounded-full ring-1 ring-white/10 ${color} flex-shrink-0`} />
      {label}
    </span>
  );
}

function TeamMemberCard({ agent, stats, unavailableTodayMs }) {
  const [expanded, setExpanded] = useState(false);
  const isAvailable = !!agent.available;
  const completedTotal = (stats?.deposits ?? 0) + (stats?.withdrawals ?? 0);

  return (
    <div className="card hover:border-gray-300 dark:hover:border-gray-700 transition-all">
      <button onClick={() => setExpanded(v => !v)} className="w-full flex items-start gap-3 text-left">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0
          ${isAvailable ? 'bg-emerald-500/10' : 'bg-gray-100 dark:bg-gray-800'}`}>
          {isAvailable
            ? <Wifi className="w-5 h-5 text-emerald-400" />
            : <WifiOff className="w-5 h-5 text-gray-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-gray-900 dark:text-white font-semibold truncate block">{agent.name || 'Agent'}</span>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <StatusDot color={agent.active ? 'bg-green-400' : 'bg-red-400'} label={agent.active ? 'Actif' : 'Inactif'} />
            <StatusDot color={isAvailable ? 'bg-emerald-400' : 'bg-orange-400'} label={isAvailable ? 'Disponible' : 'Indisponible'} />
            {agent.availabilityChangedAt && (
              <span className="text-gray-500 text-xs">depuis {formatRelativeTime(agent.availabilityChangedAt).toLowerCase()}</span>
            )}
          </div>
          <p className="text-gray-500 text-xs mt-1.5">
            {stats?.deposits ?? 0} dépôts · {stats?.withdrawals ?? 0} retraits ·{' '}
            <span className="text-primary-600 dark:text-primary-400 font-medium">{formatCFA(stats?.totalAmount ?? 0)}</span> traités
          </p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-500 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800/60 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5">
              <p className="text-gray-500 text-xs mb-1">Indisponible aujourd'hui</p>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-gray-900 dark:text-white text-sm font-bold">{formatDuration(unavailableTodayMs)}</span>
              </div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl px-3 py-2.5">
              <p className="text-gray-500 text-xs mb-1">Total traité</p>
              <span className="text-gray-900 dark:text-white text-sm font-bold">{completedTotal}</span>
            </div>
          </div>
          {stats?.cancelled > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span className="text-amber-300 text-xs">{stats.cancelled} commande{stats.cancelled > 1 ? 's' : ''} annulée{stats.cancelled > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SuperAgentDashboard() {
  const { userProfile } = useAuth();
  const { agents: team, loading: teamLoading } = useSuperAgentTeam();

  const teamIds = useMemo(() => team.map((a) => a.uid), [team]);
  const agentNamesById = useMemo(
    () => Object.fromEntries(team.map((a) => [a.uid, a.name])),
    [team]
  );

  const { transactions, loading: txLoading } = useSuperAgentTransactions(teamIds, agentNamesById);
  const { logs } = useTeamAvailabilityLogs(teamIds);

  const [periodFilter, setPeriodFilter] = useState('today');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState(null);

  const [notifPermission, setNotifPermission] = useState(getNotificationPermission());
  const [requestingNotif, setRequestingNotif] = useState(false);

  const handleEnableNotifications = async () => {
    setRequestingNotif(true);
    const result = await requestNotificationPermission();
    setNotifPermission(result);
    setRequestingNotif(false);
  };

  // Stats de traitement par agent (dépôts/retraits/montant/annulations) —
  // même agrégation que côté admin, à partir des transactions terminées ou
  // annulées de l'équipe.
  const statsByAgent = useMemo(() => {
    const stats = {};
    transactions
      .filter((t) => t.status === 'completed' || t.status === 'cancelled')
      .forEach((t) => {
        const agentId = t.agentId;
        if (!agentId || !teamIds.includes(agentId)) return;
        if (!stats[agentId]) stats[agentId] = { deposits: 0, withdrawals: 0, cancelled: 0, totalAmount: 0 };
        const s = stats[agentId];
        if (t.status === 'cancelled') {
          s.cancelled++;
        } else {
          if (t.type === 'deposit') s.deposits++;
          else s.withdrawals++;
          s.totalAmount += (t.amount || 0);
        }
      });
    return stats;
  }, [transactions, teamIds]);

  const logsByAgent = useMemo(() => {
    const map = {};
    logs.forEach((l) => {
      if (!map[l.agentId]) map[l.agentId] = [];
      map[l.agentId].push(l);
    });
    return map;
  }, [logs]);

  const todayStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);
  const now = useMemo(() => new Date(), []);

  const availableCount = team.filter((a) => a.available).length;
  const todayCompletedCount = transactions.filter((t) => {
    if (t.status !== 'completed') return false;
    const t0 = t.updatedAt?.toMillis ? t.updatedAt.toMillis() : 0;
    return t0 >= todayStart.getTime();
  }).length;

  const handleExport = async () => {
    setExporting(true);
    setExportError('');
    try {
      const start = periodStartDate(periodFilter);
      const rows = transactions.filter((t) => {
        const t0 = t.createdAt?.toMillis ? t.createdAt.toMillis() : 0;
        return t0 >= start.getTime();
      });

      if (rows.length === 0) {
        setExportError('Aucune transaction sur cette période pour votre équipe.');
        return;
      }

      const headers = ['ID', 'Type', 'Statut', 'Plateforme', 'Montant (FCFA)', 'Agent', 'Attente', 'Date'];
      const pdfRows = rows.map((tx) => [
        formatTxId(tx.id),
        tx.type === 'deposit' ? 'Dépôt' : 'Retrait',
        tx.status,
        tx.platform?.toUpperCase() || '',
        formatCFA(tx.amount ?? 0),
        agentNamesById[tx.agentId] || agentNamesById[tx.assignedAgentId] || '',
        formatDuration(computeWaitMs(tx)),
        formatDate(tx.createdAt),
      ]);

      const periodLabel = PERIOD_FILTERS.find((p) => p.value === periodFilter)?.label || periodFilter;
      const completedVolume = rows.filter((t) => t.status === 'completed').reduce((s, t) => s + (t.amount || 0), 0);
      const dateStamp = new Date().toISOString().slice(0, 10);

      const { downloadPDFReport } = await import('../../utils/pdf');
      downloadPDFReport({
        title: `Rapport d'équipe — ${userProfile?.name || 'Superviseur'} — ${periodLabel}`,
        subtitle: `${rows.length} transaction${rows.length > 1 ? 's' : ''} — Volume complété : ${formatCFA(completedVolume)}`,
        headers,
        rows: pdfRows,
        filename: `equipe_${(userProfile?.name || 'superagent').replace(/\s+/g, '-').toLowerCase()}_${periodFilter}_${dateStamp}.pdf`,
      });
    } catch (e) {
      setExportError(`Erreur lors de l'export : ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

  const loading = teamLoading || txLoading;

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="page-title">Mon équipe</h1>
          <p className="text-gray-400 text-sm mt-1">
            Bonjour <span className="text-white font-medium">{userProfile?.name || 'Superviseur'}</span>
          </p>
        </div>

        {/* Bannière notifications */}
        {isNotificationSupported() && notifPermission === 'default' && (
          <div className="rounded-2xl p-4 border-2 border-primary-500/30 bg-primary-500/10 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center flex-shrink-0">
              <BellRing className="w-5 h-5 text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-primary-300">Activez les notifications</p>
              <p className="text-gray-400 text-xs mt-0.5">
                Soyez alerté dès qu'une transaction est affectée à l'un de vos agents.
              </p>
            </div>
            <button
              onClick={handleEnableNotifications}
              disabled={requestingNotif}
              className="flex-shrink-0 px-3 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold transition-all disabled:opacity-60"
            >
              {requestingNotif ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Activer'}
            </button>
          </div>
        )}

        {/* Stats globales */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500/10 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-400" />
              </div>
              <div>
                <p className="text-gray-500 text-xs">Équipe</p>
                <p className="text-2xl font-bold text-white">{team.length}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <Wifi className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-gray-500 text-xs">Disponibles</p>
                <p className="text-2xl font-bold text-white">{availableCount}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <ArrowDownCircle className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-500 text-xs">Traitées aujourd'hui</p>
                <p className="text-2xl font-bold text-white">{todayCompletedCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Export */}
        <div className="card">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-gray-900 dark:text-white font-semibold text-sm">Rapport d'équipe</p>
              <p className="text-gray-500 text-xs mt-0.5">Export PDF des transactions de vos agents</p>
            </div>
            <div className="flex items-center gap-2">
              <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}
                className="input-field text-sm py-2 w-auto">
                {PERIOD_FILTERS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <button onClick={handleExport} disabled={exporting} className="btn-primary text-sm py-2">
                {exporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4" /> PDF</>}
              </button>
            </div>
          </div>
          {exportError && <p className="text-red-400 text-xs mt-2">{exportError}</p>}
        </div>

        {/* Liste équipe */}
        <div>
          <h2 className="section-title mb-3">Membres de l'équipe</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gray-800 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-800 rounded w-32 mb-2" />
                      <div className="h-3 bg-gray-800 rounded w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : team.length === 0 ? (
            <div className="card text-center py-12">
              <Users className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400 font-medium">Aucun agent assigné</p>
              <p className="text-gray-600 text-sm mt-1">
                Contactez l'administrateur pour vous faire assigner des agents.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {team.map((agent) => (
                <TeamMemberCard
                  key={agent.uid}
                  agent={agent}
                  stats={statsByAgent[agent.uid]}
                  unavailableTodayMs={computeUnavailableDuration(logsByAgent[agent.uid] || [], todayStart, now)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Historique des transactions de l'équipe — lecture seule */}
        <div>
          <h2 className="section-title mb-3">Historique des transactions</h2>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide mb-3">
            {HISTORY_STATUS_FILTERS.map((f) => (
              <button key={f.label} onClick={() => setHistoryStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0
                  ${historyStatusFilter === f.value ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
                {f.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-800 rounded-full" />
                    <div className="flex-1">
                      <div className="h-3 bg-gray-800 rounded w-32 mb-2" />
                      <div className="h-2 bg-gray-800 rounded w-24" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (() => {
            const historyTx = historyStatusFilter
              ? transactions.filter((t) => t.status === historyStatusFilter)
              : transactions;
            return historyTx.length === 0 ? (
              <div className="card text-center py-12">
                <AlertCircle className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-400 font-medium">Aucune transaction</p>
              </div>
            ) : (
              <div className="space-y-2">
                {historyTx.map((tx) => {
                  const isDeposit = tx.type === 'deposit';
                  const operator = AGENT_NUMBERS.find((o) => o.id === tx.operator);
                  const phone = isDeposit ? tx.clientPhone : tx.phone;
                  const agentName = tx.agentName || agentNamesById[tx.agentId] || agentNamesById[tx.assignedAgentId];
                  return (
                    <div key={tx.id} className="card hover:border-gray-300 dark:hover:border-gray-700 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0
                          ${isDeposit ? 'bg-gold-500/10' : 'bg-emerald-500/10'}`}>
                          {isDeposit
                            ? <ArrowDownCircle className="w-4 h-4 text-gold-400" />
                            : <ArrowUpCircle className="w-4 h-4 text-emerald-400" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-gray-900 dark:text-white text-sm font-medium truncate">
                              {tx.clientName || 'Client'}
                            </span>
                            <span className="text-gray-600 text-xs">{formatTxId(tx.id)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {operator && (
                              <span className="inline-flex items-center gap-1.5 text-gray-500 text-xs">
                                <OperatorLogo operator={operator} className="h-3.5" boxed /> {operator.name}
                              </span>
                            )}
                            {phone && <span className="text-gray-500 text-xs">{phone}</span>}
                            <span className="text-gray-600 text-xs">•</span>
                            <span className="text-gray-600 text-xs">{tx.platform?.toUpperCase()}</span>
                            <span className="text-gray-600 text-xs">•</span>
                            <span className="text-gray-600 text-xs">{formatDate(tx.createdAt)}</span>
                          </div>
                          <p className="text-gray-500 text-xs mt-1">
                            Agent : <span className="text-gray-700 dark:text-gray-300 font-medium">{agentName || 'Non assigné'}</span>
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`font-bold text-sm ${isDeposit ? 'text-gold-600 dark:text-gold-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            {formatCFA(tx.amount)}
                          </p>
                          <div className="mt-1">
                            <StatusBadge status={tx.status} />
                          </div>
                          <p className="text-gray-500 text-xs mt-1 flex items-center justify-end gap-1">
                            <Timer className="w-3 h-3 flex-shrink-0" /> {formatDuration(computeWaitMs(tx))}
                          </p>
                        </div>
                      </div>
                      {tx.note && (
                        <p className="text-gray-500 text-xs mt-2 pl-12">Note : {tx.note}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    </Layout>
  );
}
