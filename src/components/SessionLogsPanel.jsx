import React, { useState } from 'react';
import { Clock, Download, RefreshCw } from 'lucide-react';
import { useSessionLogs } from '../hooks/useSessionLogs';
import { formatDate } from '../utils/formatters';

// Historique de connexion/déconnexion d'une personne (agent/caissier/
// superviseur/admin) — affiché dans sa fiche dépliée côté admin, avec export PDF.
export default function SessionLogsPanel({ uid, name }) {
  const { logs, loading } = useSessionLogs(uid);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { downloadPDFReport } = await import('../utils/pdf');
      const headers = ['Connexion', 'Déconnexion'];
      const rows = logs.map((l) => [
        formatDate(l.startedAt),
        l.endedAt ? formatDate(l.endedAt) : 'En cours',
      ]);
      const dateStamp = new Date().toISOString().slice(0, 10);
      downloadPDFReport({
        title: `Historique de connexion — ${name || 'Utilisateur'}`,
        subtitle: `${rows.length} session${rows.length > 1 ? 's' : ''}`,
        headers,
        rows,
        filename: `connexions_${(name || 'utilisateur').replace(/\s+/g, '-').toLowerCase()}_${dateStamp}.pdf`,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-gray-500 text-xs block">Connexions récentes</label>
        {logs.length > 0 && (
          <button onClick={handleExport} disabled={exporting}
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 disabled:opacity-50">
            {exporting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} PDF
          </button>
        )}
      </div>
      {loading ? (
        <p className="text-gray-400 dark:text-gray-600 text-xs">Chargement...</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-600 text-xs">Aucune connexion enregistrée.</p>
      ) : (
        <div className="space-y-1.5">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg px-2.5 py-1.5">
              <Clock className="w-3 h-3 flex-shrink-0" />
              {formatDate(log.startedAt)}
              <span className="text-gray-400 dark:text-gray-600">→</span>
              {log.endedAt ? formatDate(log.endedAt) : <span className="text-emerald-500 dark:text-emerald-400 font-medium">En cours</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
