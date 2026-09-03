import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
  AlertCircle,
  Download,
  RefreshCw,
  User,
  UserCog,
  Timer,
} from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import OperatorLogo from '../../components/OperatorLogo';
import { db } from '../../firebase/config';
import { useAdminTransactions, useStaffDirectory, resolveTransactionStaff } from '../../hooks/useTransactions';
import { formatCFA, formatDate, formatTxId, computeWaitMs } from '../../utils/formatters';
import { formatDuration } from '../../utils/availability';
import { AGENT_NUMBERS } from '../../utils/constants';
// Chargée dynamiquement au clic (voir handleExport) : jsPDF embarque
// html2canvas et alourdit sensiblement le bundle, à ne pas imposer à tous
// les visiteurs (clients/agents) pour une fonctionnalité réservée à l'admin.

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

// Plateformes disponibles au dépôt/retrait côté client (voir PLATFORMS dans
// src/pages/Home.jsx) — dupliqué ici volontairement car l'admin n'a besoin
// que de l'id/label, pas des couleurs du sélecteur client.
const PLATFORM_FILTERS = [
  { label: 'Toutes plateformes', value: null },
  { label: '1XBET', value: '1xbet' },
  { label: 'MELBET', value: 'melbet' },
  { label: 'BETWINNER', value: 'betwinner' },
  { label: 'CANAL+', value: 'canalplus' },
  { label: 'CANALBOX', value: 'canalbox' },
];

// Opérateurs réellement utilisés dans les transactions, dépôts et retraits
// confondus (AGENT_NUMBERS) — pas besoin de fusionner avec OPERATORS qui
// contient des entrées jamais produites par l'app et qui dupliquaient
// certains noms.
const ALL_OPERATORS = [
  { label: 'Tous', value: null },
  ...AGENT_NUMBERS.map(o => ({ label: o.name, value: o.id, icon: o.icon })),
];

// Badge opérateur coloré
function OperatorBadge({ operator }) {
  if (!operator) return null;
  const colors = {
    orange:  'bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-500/20',
    telmob:  'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/20',
    telecel: 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/20',
    moov:    'bg-blue-100 dark:bg-blue-600/15 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600/20',
    coris:   'bg-green-100 dark:bg-green-600/15 text-green-700 dark:text-green-400 border-green-300 dark:border-green-600/20',
    wave:    'bg-sky-100 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-300 dark:border-sky-500/20',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${colors[operator.id] || 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700'}`}>
      <OperatorLogo operator={operator} className="h-3.5" boxed /> {operator.name}
    </span>
  );
}

export default function AdminTransactions({ initialType = null }) {
  const { transactions, loading } = useAdminTransactions();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [operatorFilter, setOperatorFilter] = useState(null);
  const [platformFilter, setPlatformFilter] = useState(null);
  const [agentFilter, setAgentFilter] = useState(null);
  const [periodFilter, setPeriodFilter] = useState('7d');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const { agentsById, superAgentsById } = useStaffDirectory();

  // Les liens "Transactions / Dépôts / Retraits" pointent vers ce même
  // composant avec juste un `initialType` différent ; React ne le remonte
  // pas lors d'une navigation interne, donc on resynchronise explicitement
  // le filtre à chaque changement de route au lieu de compter sur la valeur
  // initiale de useState (qui n'est appliquée qu'au tout premier montage).
  useEffect(() => {
    setTypeFilter(initialType);
  }, [initialType]);

  // Liste des agents pour le filtre "par agent" — celui qui a traité la
  // transaction (tx.agentId), pas nécessairement celui à qui elle était
  // assignée au départ.
  const agents = useMemo(
    () => Object.entries(agentsById)
      .map(([id, a]) => ({ id, name: a.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    [agentsById]
  );

  const AGENT_FILTERS = [
    { label: 'Tous les agents', value: null },
    ...agents.map((a) => ({ label: a.name, value: a.id })),
  ];

  const filtered = transactions.filter((tx) => {
    if (statusFilter && tx.status !== statusFilter) return false;
    if (typeFilter && tx.type !== typeFilter) return false;
    if (operatorFilter && tx.operator !== operatorFilter) return false;
    if (platformFilter && tx.platform !== platformFilter) return false;
    if (agentFilter && tx.agentId !== agentFilter) return false;
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

  // Export PDF : requête dédiée sur la période choisie (pas limitée aux 100
  // dernières transactions de la vue temps réel), puis on applique les
  // filtres statut/type/opérateur actuellement sélectionnés à l'écran.
  const handleExport = async () => {
    setExporting(true);
    setExportError('');
    try {
      const start = periodStartDate(periodFilter);
      const q = query(
        collection(db, 'transactions'),
        where('createdAt', '>=', start),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      let rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (statusFilter) rows = rows.filter((t) => t.status === statusFilter);
      if (typeFilter) rows = rows.filter((t) => t.type === typeFilter);
      if (operatorFilter) rows = rows.filter((t) => t.operator === operatorFilter);
      if (platformFilter) rows = rows.filter((t) => t.platform === platformFilter);
      if (agentFilter) rows = rows.filter((t) => t.agentId === agentFilter);

      if (rows.length === 0) {
        setExportError('Aucune transaction sur cette période avec ces filtres.');
        return;
      }

      const headers = ['ID', 'Type', 'Statut', 'Plateforme', 'Opérateur', 'Montant (FCFA)', 'Client', 'Téléphone', 'Agent', 'Superviseur', 'Attente', 'Date'];
      const pdfRows = rows.map((tx) => {
        const isDeposit = tx.type === 'deposit';
        const phone = isDeposit ? tx.clientPhone : tx.phone;
        const staff = resolveTransactionStaff(tx, agentsById, superAgentsById);
        return [
          formatTxId(tx.id),
          isDeposit ? 'Dépôt' : 'Retrait',
          tx.status,
          tx.platform?.toUpperCase() || '',
          tx.operator || '',
          formatCFA(tx.amount ?? 0),
          tx.clientName || '',
          phone || '',
          staff.agentName || '',
          staff.superviseurName || '',
          formatDuration(computeWaitMs(tx)),
          formatDate(tx.createdAt),
        ];
      });

      const periodLabel = PERIOD_FILTERS.find((p) => p.value === periodFilter)?.label || periodFilter;
      const agentLabel = agentFilter ? AGENT_FILTERS.find((a) => a.value === agentFilter)?.label : null;
      const completedVolume = rows.filter((t) => t.status === 'completed').reduce((s, t) => s + (t.amount || 0), 0);
      const dateStamp = new Date().toISOString().slice(0, 10);

      const { downloadPDFReport } = await import('../../utils/pdf');
      downloadPDFReport({
        title: `Rapport des transactions — ${periodLabel}${agentLabel ? ` — ${agentLabel}` : ''}`,
        subtitle: `${rows.length} transaction${rows.length > 1 ? 's' : ''} — Volume complété : ${formatCFA(completedVolume)}`,
        headers,
        rows: pdfRows,
        filename: `transactions_apollonpay_${periodFilter}${agentLabel ? `_${agentLabel.replace(/\s+/g, '-').toLowerCase()}` : ''}_${dateStamp}.pdf`,
      });
    } catch (e) {
      setExportError(`Erreur lors de l'export : ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

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
                  ${statusFilter === f.value ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {TYPE_FILTERS.map((f) => (
              <button key={f.label} onClick={() => setTypeFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0
                  ${typeFilter === f.value ? 'bg-gray-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {ALL_OPERATORS.map((f) => (
              <button key={f.label} onClick={() => setOperatorFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 flex items-center gap-1.5
                  ${operatorFilter === f.value ? 'bg-orange-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
                {f.icon && <OperatorLogo operator={{ icon: f.icon, name: f.label }} className="h-3.5" boxed />}
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {PLATFORM_FILTERS.map((f) => (
              <button key={f.label} onClick={() => setPlatformFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0
                  ${platformFilter === f.value ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
                {f.label}
              </button>
            ))}
          </div>
          {agents.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {AGENT_FILTERS.map((f) => (
                <button key={f.label} onClick={() => setAgentFilter(f.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0
                    ${agentFilter === f.value ? 'bg-teal-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Export rapport */}
        <div className="card space-y-3">
          <h3 className="text-gray-900 dark:text-white font-semibold text-sm">Télécharger un rapport</h3>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {PERIOD_FILTERS.map((f) => (
              <button key={f.value} onClick={() => setPeriodFilter(f.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex-shrink-0
                  ${periodFilter === f.value ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <p className="text-gray-500 text-xs">
            Applique les filtres statut / type / opérateur / plateforme / agent sélectionnés ci-dessus.
          </p>
          {exportError && <p className="text-red-400 text-xs">{exportError}</p>}
          <button onClick={handleExport} disabled={exporting}
            className="btn-primary w-full text-sm disabled:opacity-50">
            {exporting
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <><Download className="w-4 h-4" /> Télécharger PDF</>}
          </button>
        </div>

        {/* Volume summary */}
        {!loading && filtered.length > 0 && (
          <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-primary-700 dark:text-primary-400 text-sm">Volume complété</span>
            <span className="text-primary-700 dark:text-primary-400 font-bold">{formatCFA(totalVolume)}</span>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="card animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-800 rounded-full" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-32 mb-1.5" />
                    <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded w-24" />
                  </div>
                  <div className="w-20 h-6 bg-gray-200 dark:bg-gray-800 rounded" />
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
              const operator = AGENT_NUMBERS.find(o => o.id === tx.operator);
              const phone = isDeposit ? tx.clientPhone : tx.phone;
              const staff = resolveTransactionStaff(tx, agentsById, superAgentsById);
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
                        {operator && <OperatorBadge operator={operator} />}
                        {phone && <span className="text-gray-500 text-xs">{phone}</span>}
                        <span className="text-gray-600 text-xs">•</span>
                        <span className="text-gray-600 text-xs">{tx.platform?.toUpperCase()}</span>
                        <span className="text-gray-600 text-xs">•</span>
                        <span className="text-gray-600 text-xs">{formatDate(tx.createdAt)}</span>
                      </div>
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

                  <div className="flex items-center gap-3 mt-2 pl-12 flex-wrap">
                    <span className="text-gray-500 text-xs flex items-center gap-1">
                      <User className="w-3 h-3 flex-shrink-0" />
                      {staff.agentName
                        ? <>{staff.claimed ? 'Agent' : 'Agent assigné'} : <span className="text-gray-700 dark:text-gray-300 font-medium">{staff.agentName}</span></>
                        : 'Aucun agent assigné'}
                    </span>
                    {staff.superviseurName && (
                      <span className="text-gray-500 text-xs flex items-center gap-1">
                        <UserCog className="w-3 h-3 flex-shrink-0" />
                        Superviseur : <span className="text-gray-700 dark:text-gray-300 font-medium">{staff.superviseurName}</span>
                      </span>
                    )}
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
