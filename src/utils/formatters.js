/**
 * Format a number as CFA Franc (XOF)
 */
export function formatCFA(amount) {
  if (amount === null || amount === undefined) return '0 FCFA';
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA';
}

/**
 * Format a phone number for display
 */
export function formatPhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 8) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 6)} ${digits.slice(6, 8)}`;
  }
  if (digits.length === 10 && digits.startsWith('226')) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)} ${digits.slice(9)}`;
  }
  return phone;
}

/**
 * Format a Firebase Timestamp or Date to a readable string
 */
export function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Format a date to relative time (e.g., "il y a 2h")
 */
export function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "À l'instant";
  if (diffMinutes < 60) return `Il y a ${diffMinutes}min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return formatDate(timestamp);
}

/**
 * Calculate withdrawal fee
 */
export function calculateFee(amount, type) {
  if (type === 'withdrawal') {
    return Math.round(amount * 0.01);
  }
  return 0;
}

/**
 * Format transaction ID to short display
 */
export function formatTxId(id) {
  if (!id) return '';
  return `#${id.slice(0, 8).toUpperCase()}`;
}

/**
 * Temps d'attente du client sur une transaction (en ms) : de la création de
 * la demande (createdAt) jusqu'à sa résolution (updatedAt si terminée/
 * annulée), ou jusqu'à maintenant si encore active — donne à l'admin/
 * superviseur une visibilité sur les délais de traitement réels, pas
 * seulement sur le statut. À afficher avec formatDuration() (utils/availability.js).
 */
export function computeWaitMs(transaction) {
  const created = transaction.createdAt?.toMillis
    ? transaction.createdAt.toMillis()
    : (transaction.createdAt ? new Date(transaction.createdAt).getTime() : null);
  if (!created) return null;

  const isFinal = transaction.status === 'completed' || transaction.status === 'cancelled';
  const endMs = isFinal && transaction.updatedAt
    ? (transaction.updatedAt.toMillis ? transaction.updatedAt.toMillis() : new Date(transaction.updatedAt).getTime())
    : Date.now();

  return Math.max(0, endMs - created);
}
