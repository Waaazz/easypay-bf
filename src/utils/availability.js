// Calcul de la durée cumulée d'indisponibilité d'un agent à partir de son
// historique de bascules (availabilityLogs), pour le tableau de bord
// SuperAgent.

function toMillis(ts) {
  if (!ts) return null;
  return ts.toMillis ? ts.toMillis() : new Date(ts).getTime();
}

/**
 * Durée cumulée (en ms) passée par un agent en état 'unavailable', pour la
 * portion de chaque log qui chevauche [rangeStart, rangeEnd].
 */
export function computeUnavailableDuration(logs, rangeStart, rangeEnd) {
  const rangeStartMs = rangeStart.getTime();
  const rangeEndMs = rangeEnd.getTime();
  const now = Date.now();

  return logs
    .filter((l) => l.status === 'unavailable')
    .reduce((total, l) => {
      const start = toMillis(l.startedAt);
      if (start == null) return total;
      const end = toMillis(l.endedAt) ?? now;

      const overlapStart = Math.max(start, rangeStartMs);
      const overlapEnd = Math.min(end, rangeEndMs);
      if (overlapEnd <= overlapStart) return total;

      return total + (overlapEnd - overlapStart);
    }, 0);
}

/** Formatte une durée en ms en "2h 15min" (ou "15min" / "< 1min"). */
export function formatDuration(ms) {
  if (!ms || ms < 60_000) return ms > 0 ? '< 1min' : '0min';
  const totalMinutes = Math.round(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}
