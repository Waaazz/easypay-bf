import React, { useState } from 'react';
import WhatsAppMenu from './WhatsAppMenu';

// En-tête partagé par les pages client-facing (Caissier notamment) pour une
// apparence cohérente d'une page à l'autre. Home.jsx garde son propre
// en-tête bespoke (lien Apollon+Afrik, bouton Connexion/Historique).
export default function ClientHeader() {
  const [waOpen, setWaOpen] = useState(false);

  return (
    <header className="mx-4 mt-4 mb-2 px-3 py-2 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <img src="/icon-192.png" alt="ApollonPay" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
        <span className="text-white font-extrabold text-[11px] sm:text-sm tracking-tight leading-tight truncate">ApollonPay</span>
      </div>
      <div className="relative flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={() => setWaOpen((v) => !v)}
          className="bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.553 4.116 1.522 5.849L.057 23.571a.5.5 0 0 0 .612.612l5.722-1.465A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.89 0-3.663-.523-5.176-1.432l-.37-.222-3.846.985.999-3.742-.243-.386A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
          Support
        </button>
        <WhatsAppMenu open={waOpen} onClose={() => setWaOpen(false)} align="right" />
      </div>
    </header>
  );
}
