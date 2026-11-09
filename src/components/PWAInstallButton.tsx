// Mbox_Ec - Botón y Modal de Instalación PWA
// Muestra la nueva imagen oficial de instalación Cinema Box (pwa-512x512.png) y guía visual
'use client';

import React, { useState } from 'react';
import { Download, Check, X, Sparkles, Smartphone, Monitor } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall.ts';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // Si ya está ejecutándose en modo app instalada (standalone)
  if (isInstalled) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs font-medium">
        <Check className="h-3.5 w-3.5 text-[#FF1A24]" />
        <span>Instalada</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const installed = await install();
      if (installed) {
        setShowModal(false);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="flex items-center gap-1 sm:gap-1.5 rounded-xl bg-[#FF1A24] hover:bg-[#FF242E] px-2.5 sm:px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-red-950/60 transition cursor-pointer shrink-0"
        title="Instalar Mbox_Ec en tu dispositivo móvil o computadora"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Instalar App</span>
        <span className="sm:hidden text-[11px]">Instalar</span>
      </button>

      {/* Modal Visual de Instalación PWA con la Nueva Imagen Oficial */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-3xl bg-neutral-950 border border-neutral-800 p-6 shadow-2xl text-neutral-100 flex flex-col items-center text-center">
            
            {/* Botón Cerrar */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-neutral-900 text-neutral-400 hover:text-white transition cursor-pointer"
              title="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Nueva Imagen Oficial de Instalación PWA (Squircle Cinema Box 512x512) */}
            <div className="relative mt-2 mb-4 group">
              <div className="absolute -inset-1 rounded-3xl bg-[#FF1A24] opacity-30 blur-lg group-hover:opacity-50 transition duration-500" />
              <img
                src="/pwa-512x512.png"
                alt="Icono Oficial de Instalación Mbox_Ec"
                className="relative h-28 w-28 rounded-3xl object-cover shadow-2xl border border-neutral-800"
              />
            </div>

            {/* Rótulo y Descripción */}
            <div className="space-y-1">
              <div className="text-xl font-black text-white">
                <span>MBOX</span>
                <span className="text-[#FF1A24]">_EC</span>
              </div>
              <p className="text-xs font-medium text-neutral-400 max-w-xs pt-1">
                Disfruta de películas y series en pantalla completa con acceso directo y máximo rendimiento.
              </p>
            </div>

            {/* Guía según dispositivo */}
            {isIOS ? (
              <div className="w-full mt-4 p-3.5 rounded-2xl bg-neutral-900/80 border border-neutral-800 text-left text-xs text-neutral-300 space-y-1.5">
                <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                  <Smartphone className="h-4 w-4 text-[#FF1A24]" />
                  <span>Pasos para iPhone / iPad (Safari)</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  1. Pulsa el botón <strong>Compartir</strong> (icono de cuadrado con flecha hacia arriba).<br />
                  2. Baja y pulsa <strong>"Agregar a la pantalla de inicio"</strong>.
                </p>
              </div>
            ) : isInstallable ? (
              <button
                onClick={handleInstallClick}
                className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl bg-[#FF1A24] hover:bg-[#FF242E] py-3 text-xs font-bold text-white shadow-xl shadow-red-950/80 transition cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Instalar Ahora en el Dispositivo</span>
              </button>
            ) : (
              <div className="w-full mt-4 p-3.5 rounded-2xl bg-neutral-900/80 border border-neutral-800 text-left text-xs text-neutral-300 space-y-1.5">
                <div className="flex items-center gap-1.5 text-white font-bold text-xs">
                  <Monitor className="h-4 w-4 text-[#FF1A24]" />
                  <span>Instalación en Navegador</span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  Haz clic en el icono de instalación en la barra de direcciones o en el menú de opciones de tu navegador para agregar <strong>Mbox_Ec</strong> a tus aplicaciones.
                </p>
              </div>
            )}

            <button
              onClick={() => setShowModal(false)}
              className="mt-3 text-xs text-neutral-500 hover:text-neutral-300 transition py-1 cursor-pointer"
            >
              Continuar en el navegador
            </button>

          </div>
        </div>
      )}
    </>
  );
};
