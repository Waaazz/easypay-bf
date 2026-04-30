import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Info, AlertTriangle, User, Phone, Key, HelpCircle, RefreshCw, CheckCircle, Wallet } from 'lucide-react';
import { useTransactionActions } from '../../hooks/useTransactions';

export default function Withdrawal() {
  const navigate = useNavigate();
  const location = useLocation();
  const { createTransaction, submitting } = useTransactionActions();

  const { amount = 0, platform = '1xbet' } = location.state || {};
  const platformLabel = platform.toUpperCase();

  const [step, setStep] = useState(0);
  const [accountId, setAccountId] = useState('');
  const [phone, setPhone] = useState('');
  const [accountName, setAccountName] = useState('');
  const [withdrawCode, setWithdrawCode] = useState('');
  const [error, setError] = useState('');
  const [txId, setTxId] = useState('');

  const handleSubmit = async () => {
    setError('');
    if (!accountId.trim()) { setError("Veuillez entrer votre ID de compte."); return; }
    if (!phone.trim()) { setError("Veuillez entrer votre numéro Orange Money."); return; }
    if (!accountName.trim()) { setError("Veuillez entrer le nom du compte."); return; }
    if (!withdrawCode.trim()) { setError("Veuillez entrer le code de retrait."); return; }

    const result = await createTransaction({
      type: 'withdrawal',
      amount,
      platform,
      accountId: accountId.trim(),
      phone: phone.trim(),
      accountName: accountName.trim(),
      withdrawCode: withdrawCode.trim(),
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
            <h2 className="text-xl font-bold text-gray-800 mb-2">Retrait en cours !</h2>
            <p className="text-gray-500 text-sm">
              Votre demande de retrait de <span className="font-semibold text-gray-800">{amount.toLocaleString('fr-FR')} FCFA</span> a été enregistrée.
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
          Retrait {platformLabel}
        </h1>
        <button className="w-9 h-9 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-all">
          <HelpCircle className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      <div className="p-5 space-y-4 max-w-md mx-auto">
        {/* Amount display */}
        <div className="bg-gray-100 rounded-2xl p-4 text-center">
          <p className="text-gray-500 text-sm mb-2">Montant à retirer</p>
          <div className="flex items-center justify-center gap-3">
            <Wallet className="w-7 h-7 text-[#1e3a8a]" />
            <span className="text-3xl font-bold text-[#1e3a8a]">
              {amount.toLocaleString('fr-FR')} FCFA
            </span>
          </div>
        </div>

        {/* Instructions card */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex flex-col items-center text-center mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-2">
              <Info className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-blue-700 font-semibold text-sm">Instructions pour le retrait</p>
          </div>
          <p className="text-blue-600 text-sm text-center leading-relaxed">
            Sélectionnez <strong>Express Multi service</strong> comme point de retrait lors de la demande de retrait dans votre application {platformLabel}.
          </p>

          {/* Orange Money warning */}
          <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <p className="text-orange-600 text-xs font-medium">
              Important : Les retraits ne sont acceptés que sur les numéros{' '}
              <span className="text-orange-500 font-bold">Orange Money (pas Moov Money)</span>
            </p>
          </div>
        </div>

        {/* Form */}
        <div>
          <p className="text-base font-semibold text-gray-800 mb-3">Informations de retrait</p>

          <div className="space-y-3">
            {/* ID */}
            <div>
              <p className="text-sm text-gray-600 mb-1">ID {platformLabel}</p>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder={`Votre ID ${platformLabel}`}
                  className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <p className="text-sm text-gray-600 mb-1">Numéro de téléphone Orange money</p>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Numéro Orange Money uniquement (pas Moov)"
                  className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                />
              </div>
            </div>

            {/* Account name */}
            <div>
              <p className="text-sm text-gray-600 mb-1">Nom du compte</p>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Nom sur le compte Orange money recevant le dépôt"
                  className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                />
              </div>
            </div>

            {/* Withdraw code */}
            <div>
              <p className="text-sm text-gray-600 mb-1">Code de retrait</p>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={withdrawCode}
                  onChange={(e) => setWithdrawCode(e.target.value)}
                  placeholder="Entrez votre code de retrait"
                  className="w-full bg-white border border-gray-200 rounded-2xl pl-12 pr-4 py-4 text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-[#1e3a8a] hover:bg-[#162660] text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          {submitting ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Wallet className="w-5 h-5" />
              Retrait
            </>
          )}
        </button>
      </div>
    </div>
  );
}
