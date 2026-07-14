// Notifications navigateur + son pour alerter un agent d'une nouvelle commande.
// Fonctionne tant que l'onglet ApollonPay est ouvert (même en arrière-plan) —
// aucune infrastructure serveur requise (pas de push FCM).

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission() {
  return isNotificationSupported() ? Notification.permission : 'unsupported';
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

// Petit carillon à deux notes généré via Web Audio — pas besoin de fichier audio.
export function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playTone(880, now, 0.18);
    playTone(1174.66, now + 0.14, 0.22);
    setTimeout(() => ctx.close(), 600);
  } catch {
    // Web Audio indisponible (ex. navigateur trop restrictif) — pas bloquant.
  }
}

export function notifyNewOrder(tx, formatCFA) {
  playChime();

  if (getNotificationPermission() !== 'granted') return;

  const isDeposit = tx.type === 'deposit';
  const title = isDeposit ? 'Nouveau dépôt à traiter' : 'Nouveau retrait à traiter';
  const amount = formatCFA ? formatCFA(tx.amount) : `${tx.amount} FCFA`;
  const body = `${amount} — ${(tx.platform || '').toUpperCase()}`;

  try {
    const notif = new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: tx.id,
    });
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
  } catch {
    // Certains navigateurs mobiles n'autorisent pas `new Notification()` direct
    // (il faudrait passer par un service worker) — le son a déjà joué, on ignore.
  }
}
