import React from 'react';

// Les logos fournis ont un fond blanc opaque (pas de transparence) : sur un
// fond sombre ou coloré, `boxed` les encadre d'un liseré blanc pour rester
// lisibles au lieu de flotter avec leur propre fond au milieu du reste.
export default function OperatorLogo({ operator, className = 'h-6', boxed = false }) {
  if (!operator?.icon) return null;

  const img = (
    <img
      src={operator.icon}
      alt={operator.name || ''}
      className={`${className} w-auto object-contain inline-block flex-shrink-0`}
    />
  );

  if (!boxed) return img;

  return (
    <span className="inline-flex items-center justify-center bg-white rounded-md px-1 py-0.5 flex-shrink-0">
      {img}
    </span>
  );
}
