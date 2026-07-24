import React from 'react';
import { OPERATORS } from '../utils/constants';
import OperatorLogo from './OperatorLogo';

export default function OperatorSelector({ selected, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {OPERATORS.map((op) => (
        <button
          key={op.id}
          type="button"
          onClick={() => onSelect(op.id)}
          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200
            ${selected === op.id
              ? 'border-primary-500 bg-primary-500/10'
              : 'border-gray-700 bg-gray-800 hover:border-gray-500'
            }`}
        >
          <OperatorLogo operator={op} className="h-8" boxed />
          <div className="text-left">
            <p className="text-sm font-semibold text-white">{op.name}</p>
          </div>
          {selected === op.id && (
            <div className="ml-auto w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
