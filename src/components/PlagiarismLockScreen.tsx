// Mbox_ec - Pantalla de Bloqueo por Plagio y Clonado No Autorizado
// Se activa únicamente cuando el código se ejecuta en un dominio no autorizado (espejo/clon)
'use client';

import React, { useState } from 'react';
import { ShieldAlert, ExternalLink, KeyRound, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  APP_BRAND,
  OWNER_EMAIL,
  OFFICIAL_REDIRECT_URL,
  GENESIS_AUTHORSHIP_HASH,
} from '../services/antiPlagiarism.ts';
import { getMasterAdminPin } from '../services/auth.ts';

interface PlagiarismLockScreenProps {
  unauthorizedHost: string;
  onBypass?: () => void;
}

export const PlagiarismLockScreen: React.FC<PlagiarismLockScreenProps> = ({
  unauthorizedHost,
  onBypass,
}) => {
  const [showPinInput, setShowPinInput] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const handleVerifyOwnerPin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    const masterPin = getMasterAdminPin();
    if (pinInput.trim() === masterPin) {
      if (onBypass) onBypass();
    } else {
      setPinError('PIN incorrecto. Acceso exclusivo para el propietario registrado.');
    }
  };

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/95 p-4 text-white backdrop-blur-xl">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-red-900/60 bg-gradient-to-b from-neutral-950 via-[#140406] to-black p-6 sm:p-8 shadow-2xl shadow-red-950/40">
        {/* Glow de fondo */}
        <div className="absolute -top-24 -left-24 h-56 w-56 rounded-full bg-red-600/15 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-red-600/10 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Icono de Alerta de Plagio */}
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-600/20 border border-red-500/40 text-red-500 shadow-xl shadow-red-950/50">
            <ShieldAlert className="h-9 w-9 animate-pulse" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/80 border border-red-800 text-red-400 text-[11px] font-black uppercase tracking-wider mb-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            Violación de Propiedad Intelectual Detectada
          </span>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Copia o Espejo No Autorizado
          </h1>

          <p className="mt-3 text-xs sm:text-sm text-neutral-300 leading-relaxed max-w-md">
            Esta instancia de software ha sido clonada o desplegada en un dominio no autorizado.
            Los servicios de streaming, base de datos y catálogos de{' '}
            <strong className="text-red-400 font-bold">{APP_BRAND}</strong> han sido bloqueados
            automáticamente para salvaguardar los derechos de autor.
          </p>

          {/* Ficha técnica de infracción */}
          <div className="mt-5 w-full rounded-2xl border border-red-950 bg-black/60 p-4 text-left text-xs space-y-2">
            <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
              <span className="text-neutral-500 font-medium">Dominio Infractor:</span>
              <span className="text-red-400 font-mono font-bold bg-red-950/40 px-2 py-0.5 rounded border border-red-900/40">
                {unauthorizedHost}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
              <span className="text-neutral-500 font-medium">Titular Registrado:</span>
              <span className="text-neutral-200 font-semibold">{OWNER_EMAIL}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500 font-medium">Firma Criptográfica:</span>
              <span className="text-neutral-400 font-mono text-[10px]">
                {GENESIS_AUTHORSHIP_HASH.substring(0, 16)}...
              </span>
            </div>
          </div>

          {/* Acciones principales */}
          <div className="mt-6 flex flex-col sm:flex-row w-full gap-3">
            <a
              href={OFFICIAL_REDIRECT_URL}
              target="_self"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider transition shadow-lg shadow-red-950 cursor-pointer"
            >
              <span>Ir al Sitio Oficial Autorizado</span>
              <ExternalLink className="h-4 w-4" />
            </a>

            <button
              type="button"
              onClick={() => setShowPinInput((prev) => !prev)}
              className="px-4 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <KeyRound className="h-3.5 w-3.5 text-amber-400" />
              <span>Soy el Propietario</span>
            </button>
          </div>

          {/* Formulario de Desbloqueo del Propietario */}
          {showPinInput && (
            <form
              onSubmit={handleVerifyOwnerPin}
              className="mt-4 w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3.5 text-left animate-in fade-in space-y-2.5"
            >
              <label className="text-[11px] font-semibold text-neutral-300 block">
                Introduce el PIN Maestro para verificar tu autoría en este dominio:
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="PIN Maestro del Administrador"
                  className="flex-1 rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Validar</span>
                </button>
              </div>
              {pinError && <p className="text-[11px] text-red-400">{pinError}</p>}
            </form>
          )}

          <p className="mt-4 text-[10px] text-neutral-500">
            © 2026 {APP_BRAND} • Protección Digital Criptográfica de Propiedad Intelectual.
          </p>
        </div>
      </div>
    </div>
  );
};
