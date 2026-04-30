export const OPERATORS = [
  { id: 'orange', name: 'Orange Money', color: '#FF6B00', bg: 'bg-orange-500', logo: '🟠' },
  { id: 'moov', name: 'Moov Money', color: '#0066CC', bg: 'bg-blue-600', logo: '🔵' },
  { id: 'coris', name: 'Coris Money', color: '#006400', bg: 'bg-green-800', logo: '🟢' },
  { id: 'wave', name: 'Wave', color: '#1A90FF', bg: 'bg-sky-500', logo: '🌊' },
];

export const MIN_AMOUNT = 500;
export const MAX_AMOUNT = 500000;

export const FEES = {
  deposit: 0,
  withdrawal: 0.01, // 1% withdrawal fee
};

export const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 25000, 50000];

export const STATUS_CONFIG = {
  pending: {
    label: 'En attente',
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/20',
  },
  processing: {
    label: 'En cours',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
  },
  completed: {
    label: 'Terminé',
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    border: 'border-green-400/20',
  },
  cancelled: {
    label: 'Annulé',
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/20',
  },
};

export const TRANSACTION_TYPES = {
  deposit: { label: 'Dépôt', icon: '↓', color: 'text-green-400' },
  withdrawal: { label: 'Retrait', icon: '↑', color: 'text-red-400' },
};
