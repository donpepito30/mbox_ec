// Mbox_ec - Modal de Certificado Criptográfico de Propiedad Intelectual y Autoría
// Permite al Propietario auditar el sello criptográfico y comprobar el estado de protección anti-plagio
'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  X,
  Copy,
  Check,
  Award,
  Globe,
  Lock,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { getAuthorshipCertificate } from '../services/antiPlagiarism.ts';

interface AuthorshipModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthorshipModal: React.FC<AuthorshipModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const cert = getAuthorshipCertificate();

  if (!isOpen) return null;

  const handleCopyHash = () => {
    const textToCopy =
      `CERTIFICADO DE AUTORÍA Y PROPIEDAD INTELECTUAL - MBOX_EC\n` +
      `Titular Registrado: ${cert.owner}\n` +
      `Marca Oficial: ${cert.brand}\n` +
      `Identificador de Registro: ${cert.appletId}\n` +
      `Firma Hash SHA-256: ${cert.genesisHash}\n` +
      `Régimen Legal: ${cert.licenseType}\n` +
      `Año de Registro: ${cert.registrationYear}\n` +
      `Estado de Protección: ${cert.status === 'PROTECTED_ACTIVE' ? 'ACTIVA E INVIOLABLE' : 'ALERTA DE COPIA'}\n` +
      `Dominio Oficial: https://mboxec.vercel.app`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-9990 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-neutral-800 bg-[#0e0e11] text-white shadow-2xl">
        {/* Encabezado con degradado */}
        <div className="relative border-b border-neutral-800 bg-gradient-to-r from-red-950/40 via-neutral-900 to-neutral-950 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600/20 border border-red-500/30 text-red-500">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                  <span>Certificado Oficial de Autoría</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-400 text-[10px] font-bold">
                    Válido
                  </span>
                </h3>
                <p className="text-xs text-neutral-400">
                  Protección Criptográfica contra Plagio y Copia
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Contenido del Certificado */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Tarjeta de estado de blindaje */}
          <div className="rounded-2xl border border-emerald-900/60 bg-emerald-950/20 p-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-emerald-300">
                Motor Anti-Plagio y Anti-Clonado Activo
              </p>
              <p className="text-neutral-300 leading-relaxed">
                El código de MBOX_EC cuenta con verificación continua de origen de dominio,
                ofuscación de componentes, sellado indeleble de autoría en el DOM y sensor de
                manipulación no autorizada.
              </p>
            </div>
          </div>

          {/* Ficha técnica del titular */}
          <div className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-red-500" />
                <span>Titular y Creador Registrado:</span>
              </span>
              <span className="font-bold text-white font-mono bg-neutral-800/80 px-2 py-0.5 rounded">
                {cert.owner}
              </span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-amber-400" />
                <span>Marca de la Plataforma:</span>
              </span>
              <span className="font-bold text-white">{cert.brand}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-blue-400" />
                <span>Régimen de Licencia:</span>
              </span>
              <span className="font-medium text-neutral-300">{cert.licenseType}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
              <span className="text-neutral-400">Identificador de Registro:</span>
              <span className="font-mono text-[11px] text-neutral-400">{cert.appletId}</span>
            </div>

            {/* Sello Hash Criptográfico */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-neutral-400 font-semibold text-[11px]">
                  Firma Criptográfica Génesis (SHA-256):
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Verificado</span>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-black/60 p-2.5 font-mono text-[10px] text-neutral-300 break-all select-all">
                {cert.genesisHash}
              </div>
            </div>
          </div>

          {/* Dominios Legítimos Autorizados */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 text-xs space-y-2">
            <h4 className="font-bold text-neutral-200 flex items-center gap-1.5 text-xs">
              <Globe className="h-3.5 w-3.5 text-red-500" />
              <span>Dominios Oficiales Autorizados (Whitelist):</span>
            </h4>
            <ul className="space-y-1.5 text-[11px] text-neutral-400">
              {cert.authorizedDomains.map((domain, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="font-mono text-neutral-300">{domain}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Advertencia Legal */}
          <div className="rounded-xl border border-neutral-800/80 bg-neutral-950 p-3 text-[11px] text-neutral-400 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              Cualquier instancia del proyecto ejecutada fuera de los dominios autorizados activará
              el bloqueo inmediato por violación de derechos de autor.
            </p>
          </div>
        </div>

        {/* Pie del modal con botón de copia */}
        <div className="flex items-center justify-between border-t border-neutral-800 bg-neutral-950 px-6 py-4">
          <span className="text-[11px] text-neutral-500">
            Mbox_Ec © {cert.registrationYear} • Derechos Reservados
          </span>

          <button
            type="button"
            onClick={handleCopyHash}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition cursor-pointer shadow-lg shadow-red-950/40"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" />
                <span>Certificado Copiado</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copiar Certificado de Titularidad</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
