import React from 'react';
import { WHATSAPP_NUMBERS } from '../utils/constants';

// Petit menu listant les assistants WhatsApp disponibles — affiché en overlay
// sous le bouton "Assistance"/"Support" qui l'a ouvert (le parent doit être
// positionné `relative` et gérer l'état `open`).
export default function WhatsAppMenu({ open, onClose, message, align = 'center' }) {
  if (!open) return null;

  const alignClass = align === 'right' ? 'right-0' : align === 'left' ? 'left-0' : 'left-1/2 -translate-x-1/2';

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className={`absolute z-50 top-full mt-2 ${alignClass} bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden w-52`}>
        {WHATSAPP_NUMBERS.map((number, i) => (
          <a
            key={number}
            href={`https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ''}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
            {WHATSAPP_NUMBERS.length > 1 ? `Assistant ${i + 1}` : 'Support'}
          </a>
        ))}
      </div>
    </>
  );
}
