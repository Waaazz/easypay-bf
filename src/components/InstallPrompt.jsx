import React, { useState, useEffect } from 'react';
import { Download, X, Zap, Smartphone } from 'lucide-react';

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Ne pas afficher si déjà installée (mode standalone)
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // Ne pas afficher si déjà refusé récemment
    const dismissed = localStorage.getItem('pwa-dismissed');
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return;

    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      // Délai pour ne pas afficher au chargement immédiat
      setTimeout(() => setVisible(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;
    setInstalling(true);
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    } else {
      setInstalling(false);
    }
    setPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem('pwa-dismissed', Date.now().toString());
  };

  if (!visible || !prompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 overflow-hidden max-w-sm mx-auto">
        {/* Header */}
        <div className="flex items-start gap-3 p-4 pb-3">
          {/* Icône app */}
          <div className="w-14 h-14 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md overflow-hidden">
            <img src="/icon-192.png" alt="ApollonPay" className="w-full h-full object-cover" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-gray-900 text-sm leading-tight">Installer ApollonPay</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Smartphone className="w-3 h-3 text-gray-400" />
                  <p className="text-gray-500 text-xs">Application Mobile</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 p-0.5 -mt-0.5 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="flex items-center gap-3 px-4 pb-3">
          <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
            <Zap className="w-3 h-3 text-yellow-500" />
            Accès instantané
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
            <Smartphone className="w-3 h-3 text-primary-500" />
            Hors connexion
          </span>
        </div>

        {/* Description */}
        <p className="text-gray-600 text-xs px-4 pb-4 leading-relaxed">
          Installez l'application pour un accès rapide depuis votre écran d'accueil.
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 px-4 pb-4">
          <button
            onClick={handleInstall}
            disabled={installing}
            className="flex-1 flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm py-3 px-4 rounded-xl transition-colors disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            {installing ? 'Installation...' : 'Installer'}
          </button>
          <button
            onClick={handleDismiss}
            className="text-gray-500 hover:text-gray-700 font-medium text-sm py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors whitespace-nowrap"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
