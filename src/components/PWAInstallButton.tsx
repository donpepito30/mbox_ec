import React, { useState } from 'react';
import { Download, Check, X } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall.ts';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA in standalone mode, hide
  if (isInstalled) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs font-medium">
        <Check className="h-3.5 w-3.5 text-red-500" />
        <span>Instalada</span>
      </div>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-500 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-red-950 transition cursor-pointer"
        title="Instalar Mbox_ec en tu dispositivo"
      >
        <Download className="h-3.5 w-3.5" />
        <span>Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
        >
          <Download className="h-3.5 w-3.5 text-red-500" />
          <span>Instalar en iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-neutral-950 border border-neutral-800 p-6 shadow-2xl text-neutral-100">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <h3 className="text-base font-bold text-white">
                  Instalar Mbox_ec en iOS
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded text-neutral-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-4 text-xs text-neutral-300 leading-relaxed space-y-2">
                1. Toca el botón <strong>Compartir</strong> en la barra de Safari.<br />
                2. Desplázate hacia abajo y selecciona <strong>"Agregar a la pantalla de inicio"</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-red-600 hover:bg-red-500 py-2.5 text-xs font-bold text-white transition cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
