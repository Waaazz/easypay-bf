import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  UserPlus, ChevronRight, Download, Bell, LogOut,
  TrendingUp, ArrowUpCircle, AlertCircle, Share2, Check,
} from 'lucide-react';
import ClientHeader from '../../components/ClientHeader';
import ClientBottomNav from '../../components/ClientBottomNav';
import TransactionCard from '../../components/TransactionCard';
import TransactionDetailModal from '../../components/TransactionDetailModal';
import { useClientTransactions } from '../../hooks/useTransactions';
import { useAuth } from '../../hooks/useAuth';
import { FACEBOOK_URL, APP_URL } from '../../utils/constants';
import WhatsAppMenu from '../../components/WhatsAppMenu';
import { formatCFA } from '../../utils/formatters';
import { isInstallAvailable, isStandalone, onInstallAvailabilityChange, promptInstall } from '../../utils/pwaInstall';
import {
  isNotificationSupported, getNotificationPermission, requestNotificationPermission,
} from '../../utils/notifications';

function AideItem({ icon, iconBg, title, subtitle, onClick, disabled, badge }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-colors text-left
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'bg-gray-50 hover:bg-gray-100'}`}
    >
      <span className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm flex items-center gap-2">
          {title}
          {badge && <span className="text-[10px] font-bold uppercase tracking-wide bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">{badge}</span>}
        </p>
        <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>
      </div>
      {!disabled && <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
    </button>
  );
}

function InviteSection() {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(APP_URL, {
      width: 240,
      margin: 1,
      color: { dark: '#132e05', light: '#ffffff' },
    }).then(setQrDataUrl).catch(() => {});
  }, []);

  const handleShare = async () => {
    const shareData = {
      title: 'ApollonPay',
      text: 'Dépôt et retrait instantané sur ApollonPay — installe l\'app :',
      url: APP_URL,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // Annulé par l'utilisateur ou non supporté — pas d'action de repli nécessaire.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(APP_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papier indisponible — le lien reste visible via le QR code.
    }
  };

  return (
    <div>
      <p className="text-gray-400 text-xs font-bold uppercase tracking-wide mb-2 px-1">Inviter un ami</p>
      <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center text-center gap-3">
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="QR code ApollonPay" className="w-40 h-40 rounded-xl bg-white p-2 shadow-sm" />
        ) : (
          <div className="w-40 h-40 rounded-xl bg-gray-200 animate-pulse" />
        )}
        <p className="text-gray-600 text-xs px-2">
          Faites scanner ce code à un ami pour qu'il installe ApollonPay sur son téléphone.
        </p>
        <button
          onClick={handleShare}
          className="w-full bg-primary-800 hover:bg-primary-900 text-white font-bold text-sm py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {copied ? <><Check className="w-4 h-4" /> Lien copié !</> : <><Share2 className="w-4 h-4" /> Partager le lien</>}
        </button>
      </div>
    </div>
  );
}

function AideSection() {
  const [installAvailable, setInstallAvailable] = useState(isInstallAvailable());
  const [installed, setInstalled] = useState(isStandalone());
  const [waOpen, setWaOpen] = useState(false);

  useEffect(() => onInstallAvailabilityChange((available) => {
    setInstallAvailable(available);
    if (!available) setInstalled(isStandalone());
  }), []);

  const handleInstall = async () => {
    const { outcome } = await promptInstall();
    if (outcome === 'accepted') setInstalled(true);
  };

  return (
    <div>
      <p className="text-gray-400 text-xs font-bold uppercase tracking-wide mb-2 px-1">Aide</p>
      <div className="space-y-2">
        <div className="relative">
          <AideItem
            onClick={() => setWaOpen((v) => !v)}
            iconBg="bg-green-500"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.522 5.849L.057 23.571a.5.5 0 0 0 .612.612l5.722-1.465A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.89 0-3.663-.523-5.176-1.432l-.37-.222-3.846.985.999-3.742-.243-.386A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>}
            title="Contacter le support"
            subtitle="WhatsApp — réponse rapide"
          />
          <WhatsAppMenu open={waOpen} onClose={() => setWaOpen(false)} />
        </div>
        <AideItem
          onClick={handleInstall}
          disabled={installed || !installAvailable}
          iconBg="bg-primary-800"
          icon={<Download className="w-4 h-4 text-white" />}
          title="Installer l'application"
          subtitle={installed ? 'Déjà installée' : 'Accès rapide depuis votre écran d\'accueil'}
        />
        {FACEBOOK_URL && (
          <AideItem
            onClick={() => window.open(FACEBOOK_URL, '_blank', 'noopener,noreferrer')}
            iconBg="bg-blue-500"
            icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M22 12a10 10 0 1 0-11.56 9.87v-6.98H7.9V12h2.54V9.8c0-2.5 1.5-3.89 3.78-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.98A10 10 0 0 0 22 12z"/></svg>}
            title="Nous suivre sur Facebook"
            subtitle="Actus, promos et communauté"
          />
        )}
      </div>
    </div>
  );
}

function NotificationsSection() {
  const [permission, setPermission] = useState(getNotificationPermission());
  const [requesting, setRequesting] = useState(false);

  if (!isNotificationSupported()) return null;

  const enabled = permission === 'granted';

  const handleActivate = async () => {
    setRequesting(true);
    setPermission(await requestNotificationPermission());
    setRequesting(false);
  };

  return (
    <div>
      <p className="text-gray-400 text-xs font-bold uppercase tracking-wide mb-2 px-1">Notifications push</p>
      <div className="bg-gray-50 rounded-2xl px-4 py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-gray-500" />
            <span className="text-gray-700 text-sm">État</span>
          </div>
          {enabled ? (
            <span className="text-emerald-600 text-sm font-semibold">Activées</span>
          ) : (
            <button
              onClick={handleActivate}
              disabled={requesting || permission === 'denied'}
              className="bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
            >
              {permission === 'denied' ? 'Bloquées' : requesting ? '...' : 'Activer'}
            </button>
          )}
        </div>
        <p className="text-gray-500 text-xs mt-2">
          Recevez une alerte quand vos dépôts et retraits sont traités.
        </p>
      </div>
    </div>
  );
}

function AnonymousAccount() {
  const navigate = useNavigate();
  return (
    <>
      <div className="text-center py-2">
        <div className="flex items-center justify-center gap-2">
          <img src="/icon-192.png" alt="ApollonPay" className="w-8 h-8 rounded-lg object-cover" />
          <span className="text-gray-900 font-extrabold text-xl">ApollonPay</span>
        </div>
        <p className="text-gray-500 text-sm mt-1">Dépôt & retrait instantané</p>
      </div>

      <div className="border border-gray-200 rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <span className="w-11 h-11 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-5 h-5 text-primary-700" />
          </span>
          <div>
            <p className="font-bold text-gray-900 text-sm">Créer un compte gratuit</p>
            <p className="text-gray-500 text-xs mt-0.5">
              Synchronisez votre historique sur tous vos appareils.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="w-full bg-primary-800 hover:bg-primary-900 text-white font-bold text-sm py-3 rounded-xl transition-colors"
        >
          Se connecter avec mon numéro
        </button>
      </div>
    </>
  );
}

function RegisteredAccount() {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const { transactions, loading } = useClientTransactions();
  const [selectedTx, setSelectedTx] = useState(null);

  const completedTx = transactions.filter((t) => t.status === 'completed');
  const totalDeposited = completedTx.filter((t) => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
  const totalWithdrawn = completedTx.filter((t) => t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0);
  const recentTransactions = transactions.slice(0, 3);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <>
      <div className="border border-gray-200 rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-gray-900">{userProfile?.name || 'Client'}</p>
          <p className="text-gray-500 text-sm">{userProfile?.phone}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-red-500 hover:text-red-600 text-sm font-semibold flex-shrink-0"
        >
          <LogOut className="w-4 h-4" /> Déconnexion
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-2xl p-3.5 flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </span>
          <div className="min-w-0">
            <p className="text-gray-500 text-[11px]">Déposé</p>
            <p className="font-bold text-gray-900 text-sm truncate">{formatCFA(totalDeposited)}</p>
          </div>
        </div>
        <div className="bg-gray-50 rounded-2xl p-3.5 flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-full bg-gold-50 flex items-center justify-center flex-shrink-0">
            <ArrowUpCircle className="w-4 h-4 text-gold-600" />
          </span>
          <div className="min-w-0">
            <p className="text-gray-500 text-[11px]">Retiré</p>
            <p className="font-bold text-gray-900 text-sm truncate">{formatCFA(totalWithdrawn)}</p>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wide">Transactions récentes</p>
          <button onClick={() => navigate('/history')} className="text-primary-700 text-xs font-semibold">Voir tout</button>
        </div>
        {loading ? (
          <div className="h-16 bg-gray-50 rounded-2xl animate-pulse" />
        ) : recentTransactions.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <AlertCircle className="w-6 h-6 text-gray-400 mx-auto mb-1" />
            <p className="text-gray-500 text-sm">Aucune transaction</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((tx) => (
              <TransactionCard key={tx.id} transaction={tx} onClick={() => setSelectedTx(tx)} />
            ))}
          </div>
        )}
      </div>

      <TransactionDetailModal transaction={selectedTx} onClose={() => setSelectedTx(null)} />
    </>
  );
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const isRegistered = !!user && !user.isAnonymous;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #69c522 0%, #3a8015 100%)' }}>
      <ClientHeader />

      <div className="flex-1 mx-4 mb-4 bg-white rounded-3xl shadow-xl shadow-black/10 p-5 space-y-5 overflow-y-auto">
        {isRegistered ? <RegisteredAccount /> : <AnonymousAccount />}

        <InviteSection />

        <AideSection />
        <NotificationsSection />

        {!isRegistered && (
          <p className="text-gray-400 text-xs text-center pb-1">
            Aucune inscription requise — vos données restent sur cet appareil.
          </p>
        )}
      </div>

      <ClientBottomNav active="compte" />
    </div>
  );
}
