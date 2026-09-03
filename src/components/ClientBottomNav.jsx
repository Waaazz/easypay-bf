import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpDown, History, User, Wallet } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

// Barre de navigation partagée par les pages client-facing et par l'espace
// caissier, qui suit le même schéma à trois onglets (juste pointé vers ses
// propres routes /caissier/*). `active` détermine l'onglet mis en évidence.
export default function ClientBottomNav({ active }) {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const isCaissier = userProfile?.role === 'caissier';

  const transactionPath = isCaissier ? '/caissier' : '/';
  const historyPath = isCaissier ? '/caissier/historique' : '/history';
  const accountPath = isCaissier ? '/caissier/compte' : '/dashboard';

  const tabClass = (tab) =>
    `flex flex-col items-center gap-1 px-3 py-1 transition-colors ${
      active === tab ? 'text-primary-600' : 'text-gray-400 hover:text-primary-600'
    }`;

  return (
    <nav className="flex items-center justify-around bg-white border-t border-gray-200 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <button onClick={() => navigate(transactionPath)} className={tabClass('transaction')}>
        <ArrowUpDown className="w-5 h-5" />
        <span className="text-[11px] font-semibold">Transaction</span>
      </button>
      {/* Pour un caissier déjà connecté, "Transaction" pointe déjà vers /caissier :
          afficher un onglet "Caissier" séparé serait une pure duplication. */}
      {!isCaissier && (
        <button onClick={() => navigate('/caissier/login')} className={tabClass('caissier')}>
          <Wallet className="w-5 h-5" />
          <span className="text-[11px] font-semibold">Caissier</span>
        </button>
      )}
      <button onClick={() => navigate(historyPath)} className={tabClass('historique')}>
        <History className="w-5 h-5" />
        <span className="text-[11px] font-semibold">Historique</span>
      </button>
      <button onClick={() => navigate(accountPath)} className={tabClass('compte')}>
        <User className="w-5 h-5" />
        <span className="text-[11px] font-semibold">Compte</span>
      </button>
    </nav>
  );
}
