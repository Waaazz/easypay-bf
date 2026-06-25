import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Phone, ArrowRight, RefreshCw, ChevronLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const STEPS = { PHONE: 'phone', OTP: 'otp', PROFILE: 'profile' };

export default function Login() {
  const { sendOTP, verifyOTP, userProfile, updateUserProfile, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState(STEPS.PHONE);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  const from = location.state?.from?.pathname || '/dashboard';

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timer); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const formatPhoneForFirebase = (raw) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('226')) return `+${digits}`;
    if (digits.length === 8) return `+226${digits}`;
    return `+${digits}`;
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setError('');
    if (!phone || phone.replace(/\D/g, '').length < 8) {
      setError('Veuillez entrer un numéro de téléphone valide.');
      return;
    }
    setLoading(true);
    const formatted = formatPhoneForFirebase(phone);
    const result = await sendOTP(formatted);
    setLoading(false);
    if (result.success) {
      setStep(STEPS.OTP);
      startCountdown();
    } else {
      setError(result.error || 'Erreur lors de l\'envoi du code OTP.');
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp || otp.length < 6) {
      setError('Veuillez entrer le code à 6 chiffres.');
      return;
    }
    setLoading(true);
    const result = await verifyOTP(otp);
    setLoading(false);
    if (result.success) {
      // Check if profile name is set
      const docProfile = result.user;
      // We'll fetch profile from context after redirect
      // If no name, go to profile step
      setStep(STEPS.PROFILE);
    } else {
      setError(result.error || 'Code invalide.');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Veuillez entrer votre prénom.');
      return;
    }
    setLoading(true);
    const result = await updateUserProfile({ name: name.trim() });
    setLoading(false);
    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || 'Erreur lors de la mise à jour du profil.');
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError('');
    const formatted = formatPhoneForFirebase(phone);
    setLoading(true);
    const result = await sendOTP(formatted);
    setLoading(false);
    if (result.success) {
      startCountdown();
    } else {
      setError(result.error || 'Erreur lors de l\'envoi.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-900/50">
          <span className="text-white font-bold text-3xl">E</span>
        </div>
        <h1 className="text-white text-2xl font-bold">EasyPay BF</h1>
        <p className="text-gray-500 text-sm mt-1">Dépôt & Retrait Paris Sportifs</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md card animate-fade-in">
        {/* Back button for OTP/Profile steps */}
        {step !== STEPS.PHONE && (
          <button
            onClick={() => setStep(step === STEPS.PROFILE ? STEPS.OTP : STEPS.PHONE)}
            className="flex items-center gap-1 text-gray-400 hover:text-white mb-4 text-sm transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour
          </button>
        )}

        {/* Step: Phone */}
        {step === STEPS.PHONE && (
          <>
            <h2 className="text-xl font-bold text-white mb-1">Connexion</h2>
            <p className="text-gray-400 text-sm mb-6">
              Entrez votre numéro de téléphone pour recevoir un code de vérification.
            </p>
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="label">Numéro de téléphone</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="text-gray-400 text-sm font-medium">🇧🇫 +226</span>
                    <div className="w-px h-5 bg-gray-700" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="70 00 00 00"
                    className="input-field pl-24"
                    maxLength={12}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Recevoir le code <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {/* Step: OTP */}
        {step === STEPS.OTP && (
          <>
            <h2 className="text-xl font-bold text-white mb-1">Vérification</h2>
            <p className="text-gray-400 text-sm mb-6">
              Un code à 6 chiffres a été envoyé au <span className="text-white font-medium">{phone}</span>
            </p>
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <label className="label">Code OTP</label>
                <input
                  type="number"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.slice(0, 6))}
                  placeholder="123456"
                  className="input-field text-center text-2xl tracking-[0.5em] font-bold"
                  maxLength={6}
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  'Vérifier le code'
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={countdown > 0}
                  className="text-sm text-gray-400 hover:text-primary-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {countdown > 0
                    ? `Renvoyer dans ${countdown}s`
                    : 'Renvoyer le code'}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Step: Profile */}
        {step === STEPS.PROFILE && (
          <>
            <h2 className="text-xl font-bold text-white mb-1">Votre profil</h2>
            <p className="text-gray-400 text-sm mb-6">
              Comment souhaitez-vous être appelé ?
            </p>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="label">Prénom & Nom</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Moussa Ouédraogo"
                  className="input-field"
                  autoFocus
                />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>Continuer <ArrowRight className="w-4 h-4" /></>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate(from, { replace: true })}
                className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors py-2"
              >
                Passer cette étape
              </button>
            </form>
          </>
        )}
      </div>

      <p className="text-gray-600 text-xs mt-6 text-center">
        En continuant, vous acceptez nos{' '}
        <span className="text-gray-400">Conditions d'utilisation</span>
      </p>

      {/* Requis par Firebase Phone Auth pour le reCAPTCHA invisible */}
      <div id="recaptcha-container" />
    </div>
  );
}
