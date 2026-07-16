import React, { useState, useEffect } from 'react';
import { Timer, Info } from 'lucide-react';

/**
 * Décompte visuel affiché pendant qu'un agent traite une transaction.
 * À zéro, remplace la barre par un message rassurant plutôt que de rester
 * bloqué sur "0s" — le statut temps réel (LiveStatus) continue de fonctionner
 * indépendamment de ce composant.
 */
export default function WaitingCountdown({ seconds = 60 }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining]);

  if (remaining <= 0) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-2.5">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <p className="text-blue-700 text-xs leading-relaxed">
          Le traitement prend un peu plus de temps que prévu. Vous pouvez contacter le support si besoin.
        </p>
      </div>
    );
  }

  const pct = Math.round(((seconds - remaining) / seconds) * 100);

  return (
    <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
      <Timer className="w-4 h-4 text-gray-400 flex-shrink-0" />
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-500 transition-all duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-gray-500 text-xs font-mono font-semibold tabular-nums flex-shrink-0">{remaining}s</span>
    </div>
  );
}
