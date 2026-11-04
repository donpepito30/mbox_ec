// Mbox_Ec - Isotipo Oficial Cinema Box (Caja de Cine Prismática 3D)
// Directriz: Sin botones de play, sin trazos curvos tipo Gmail/Google, 100% geométrico cinematográfico
'use client';

import React from 'react';

interface CinemaBoxLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
}

export const CinemaBoxLogo: React.FC<CinemaBoxLogoProps> = ({
  size = 'md',
  showTagline = true,
  className = '',
}) => {
  const iconDimensions = {
    sm: { width: 32, height: 32 },
    md: { width: 40, height: 40 },
    lg: { width: 52, height: 52 },
    xl: { width: 68, height: 68 },
  }[size];

  const textClasses = {
    sm: 'text-xl',
    md: 'text-2xl sm:text-3xl',
    lg: 'text-3xl sm:text-4xl',
    xl: 'text-4xl sm:text-5xl',
  }[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Isotipo Cinema Box Vectorial */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg
          width={iconDimensions.width}
          height={iconDimensions.height}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-[0_0_12px_rgba(255,26,36,0.65)]"
        >
          <defs>
            {/* Gradientes Oficiales Mbox_Ec */}
            <linearGradient id="prismLeft" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF242E" />
              <stop offset="100%" stopColor="#A00007" />
            </linearGradient>

            <linearGradient id="prismCenter" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FF1A24" />
              <stop offset="50%" stopColor="#E60012" />
              <stop offset="100%" stopColor="#8A0006" />
            </linearGradient>

            <linearGradient id="prismRight" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FF3B45" />
              <stop offset="100%" stopColor="#A00007" />
            </linearGradient>

            <linearGradient id="glowFloor" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>

            <filter id="neonBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>
          </defs>

          {/* Sombra / Fondo sutil carbón */}
          <rect x="6" y="6" width="88" height="88" rx="22" fill="#0E0F14" stroke="#252530" strokeWidth="2.5" />

          {/* Faceta Prismática Izquierda (Pantalla en ángulo) */}
          <path
            d="M26 24 L45 32 L45 74 L26 66 Z"
            fill="url(#prismLeft)"
            stroke="#FF4D55"
            strokeWidth="0.8"
          />

          {/* Faceta Prismática Central (Pantalla Frontal) */}
          <path
            d="M45 32 L55 32 L55 74 L45 74 Z"
            fill="url(#prismCenter)"
          />

          {/* Faceta Prismática Derecha (Pantalla en ángulo) */}
          <path
            d="M55 32 L74 24 L74 66 L55 74 Z"
            fill="url(#prismRight)"
            stroke="#FF4D55"
            strokeWidth="0.8"
          />

          {/* Marco Superior Reflectivo Cinematográfico */}
          <path
            d="M26 24 L50 20 L74 24"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinecap="round"
            filter="url(#neonBlur)"
          />

          {/* Línea Reflectiva Blanca Inferior de Escenario */}
          <line
            x1="22"
            y1="82"
            x2="78"
            y2="82"
            stroke="url(#glowFloor)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Rótulo Tipográfico Oficial Mbox_Ec - Únicamente el logo */}
      <div className={`font-black tracking-tighter leading-none select-none ${textClasses}`}>
        <span className="text-white">MBOX</span>
        <span className="text-[#FF1A24]">_EC</span>
      </div>
    </div>
  );
};
