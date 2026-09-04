export const OPERATORS = [
  { id: 'orange', name: 'Orange Money', color: '#FF6B00', bg: 'bg-orange-500', icon: '/assets/operators/orange-money.png' },
  { id: 'moov', name: 'Moov Money', color: '#0066CC', bg: 'bg-blue-600', icon: '/assets/operators/moov-money.png' },
  { id: 'coris', name: 'Coris Money', color: '#006400', bg: 'bg-green-800', logo: '🟢' },
  { id: 'wave', name: 'Wave', color: '#1A90FF', bg: 'bg-sky-500', logo: '🌊' },
];

export const AGENT_NUMBERS = [
  {
    id: 'orange',
    name: 'Orange Money',
    icon: '/assets/operators/orange-money.png',
    dot: 'bg-orange-500',
    text: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
  },
  {
    id: 'telmob',
    name: 'Moov Money',
    icon: '/assets/operators/moov-money.png',
    dot: 'bg-red-500',
    text: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  {
    id: 'telecel',
    name: 'Telecel Money',
    icon: '/assets/operators/telecel-money.png',
    dot: 'bg-blue-600',
    text: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
];

// Plateformes que peut gérer un agent (paris sportifs + abonnements) —
// assignées depuis admin/Agents.jsx, utilisées par getActiveNumbers() pour
// router en priorité les dépôts/retraits/paiements vers un agent compétent
// (voir useTransactions.js). Un agent sans `platforms` défini est considéré
// comme gérant tout (comptes créés avant l'ajout de ce champ).
export const AGENT_PLATFORMS = [
  { id: '1xbet', label: '1XBET' },
  { id: 'melbet', label: 'MELBET' },
  { id: 'betwinner', label: 'BETWINNER' },
  { id: 'canalplus', label: 'CANAL+' },
  { id: 'canalbox', label: 'CANALBOX' },
];

// Générateurs de codes USSD par opérateur (Orange confirmé, Telmob/Telecel à vérifier)
export const USSD_CODE = {
  orange:  (agentRaw, amount) => `*144*2*1*${agentRaw}*${amount}#`,
  telmob:  (agentRaw, amount) => `*555*1*${agentRaw}*${amount}#`,
  telecel: (agentRaw, amount) => `*135*1*${agentRaw}*${amount}#`,
};

// Numéros WhatsApp support — un ou plusieurs assistants ; WhatsAppMenu
// affiche un choix si plusieurs, sinon un lien direct suffit.
export const WHATSAPP_NUMBERS = ['22644002222'];

// URL publique de l'app — utilisée pour le QR code de parrainage et le partage.
export const APP_URL = 'https://project-wexlx.vercel.app';

// Page Facebook officielle — laisser vide pour masquer le bouton "Nous
// suivre sur Facebook" tant qu'elle n'est pas configurée.
export const FACEBOOK_URL = 'https://web.facebook.com/profile.php?id=61576471814091&locale=fr_FR';

export const DEPOSIT_SESSION_MINUTES = 15;

export const MIN_AMOUNT = 500;
export const MAX_AMOUNT = 500000;

export const FEES = {
  deposit: 0,
  withdrawal: 0, // 0% withdrawal fee
};

export const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 25000, 50000];

// Le texte -400 (pensé pour fond sombre) est trop clair sur fond blanc en
// mode clair — on ajoute donc une teinte -700 par défaut, remplacée par la
// -400 d'origine en mode sombre via le variant `dark:`.
export const STATUS_CONFIG = {
  pending: {
    label: 'En attente',
    color: 'text-yellow-700 dark:text-yellow-400',
    bg: 'bg-yellow-100 dark:bg-yellow-400/10',
    border: 'border-yellow-300 dark:border-yellow-400/20',
  },
  processing: {
    label: 'En cours',
    color: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-400/10',
    border: 'border-blue-300 dark:border-blue-400/20',
  },
  completed: {
    label: 'Terminé',
    color: 'text-green-700 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-400/10',
    border: 'border-green-300 dark:border-green-400/20',
  },
  cancelled: {
    label: 'Annulé',
    color: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-400/10',
    border: 'border-red-300 dark:border-red-400/20',
  },
  awaiting_confirmation: {
    label: 'Paiement envoyé',
    color: 'text-purple-700 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-400/10',
    border: 'border-purple-300 dark:border-purple-400/20',
  },
};

export const TRANSACTION_TYPES = {
  deposit: { label: 'Dépôt', icon: '↓', color: 'text-green-400' },
  withdrawal: { label: 'Retrait', icon: '↑', color: 'text-red-400' },
};
