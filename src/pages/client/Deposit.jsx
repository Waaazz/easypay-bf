import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Wallet, User, AlertCircle, ArrowRight, RefreshCw, CheckCircle } from 'lucide-react';
import { useTransactionActions } from '../../hooks/useTransactions';

export default function Deposit() {
  const navigate = useNavigate();
  const location = useLocation();
  const { createTransaction, submitting } = useTransactionActions();

  const { amount = 0, platform = '1xbet' } = location.state || {};
  const platformLabel = platform.toUpperCase();

  const [step, setStep] = useState(0); // 0: account ID, 1: success
  const [accountId, setAccountId] = useState('');
  const [error, setError] = useState('');
  const [txId, setTxId] = useState('');

  const handleContinue = async () => {
    setError('');
    if (!accountId.trim()) {
      setError("Veuillez entrer votre ID de compte.");
      return;
    }
    const result = await createTransaction({
      type: 'deposit',
      amount,
      platform,
      accountId: accountId.trim(),
    });
    if (result.success) {
      setTxId(result.id);
      setStep(1);
    } else {
      setError(result.error || 'Une erreur est survenue.');
    }
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-sm space-y-5">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Demande envoyée !</h2>
            <p className="text-gray-500 text-sm">
              Votre demande de dépôt de <span className="font-semibold text-gray-800">{amount.toLocaleString('fr-FR')} FCFA</span> sur {platformLabel} a été envoyée.
            </p>
          </div>
          <div className="bg-gray-100 rounded-xl px-4 py-3">
            <p className="text-gray-500 text-xs">Référence</p>
            <p className="text-gray-800 font-mono font-bold mt-1">#{txId.slice(0, 12).toUpperCase()}</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-[#1e3a8a] hover:bg-[#162660] text-white font-semibold py-4 rounded-2xl transition-all"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-all"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="flex-1 text-center text-base font-bold text-[#1e3a8a]">
          Recharge {platformLabel}
        </h1>
        <div className="w-9" />
      </div>

      <div className="p-5 space-y-5 max-w-md mx-auto">
        {/* Amount card */}
        <div className="bg-gray-100 rounded-2xl p-4 text-center">
          <p className="text-gray-500 text-sm mb-2">Montant à déposer</p>
          <div className="flex items-center justify-center gap-3">
            <Wallet className="w-7 h-7 text-[#1e3a8a]" />
            <span className="text-3xl font-bold text-[#1e3a8a]">
              {amount.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        </div>

        {/* Account ID */}
        <div>
          <p className="text-base font-semibold text-gray-800 mb-3">Information du compte</p>
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <User className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="Entrez votre ID de compte"
              className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              autoFocus
            />
          </div>
        </div>

        {/* Warning */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-600 font-semibold text-sm mb-1">Information importante</p>
            <p className="text-red-500 text-sm leading-relaxed">
              En cas d'erreur sur le numéro de compte {platformLabel}, aucun remboursement ne pourra être effectué. Veuillez vérifier attentivement votre ID de compte et votre nom dans la description de la page suivante.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {/* Continue button */}
        <button
          onClick={handleContinue}
          disabled={submitting}
          className="w-full bg-[#1e3a8a] hover:bg-[#162660] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {submitting ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Continuer <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
