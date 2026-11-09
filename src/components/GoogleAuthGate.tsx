// Mbox_ec - Puerta de Enlace de Autenticación Exclusiva con Google (Content Gate)
// Integración Real con Google Firebase Auth (OAuth Popup) y Respaldo Seguro
// Fondo Cinemático con Mosaico de Pósteres y Portadas (100% Inerte y Seguro)
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Clock,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  Ban,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import {
  authenticateWithGoogle,
  authenticateWithVerifiedGoogleUser,
  checkRateLimit,
  checkAdminPinRateLimit,
  validateGoogleEmail,
  getCurrentUser,
  logoutUser,
  isSuperAdmin,
  User,
} from '../services/auth.ts';
import { maskEmail } from '../services/security.ts';
import { loginWithGoogle, checkRedirectAuthResult } from '../services/firebase.ts';
import { CinemaBoxLogo } from './CinemaBoxLogo.tsx';

interface GoogleAuthGateProps {
  onSuccess: (user: User) => void;
  moviePosters?: string[];
}

interface PosterItem {
  id: string;
  title: string;
  url: string;
  type?: 'poster' | 'backdrop';
}

/**
 * Catálogo icónico de pósteres y portadas cinemáticas oficiales de alta definición (TMDb)
 * Diseñado exclusivamente para ambientación estética de fondo sin comprometer la seguridad.
 */
const CINEMA_POSTERS_AND_COVERS: PosterItem[] = [
  // --- Taquillazos y Éxitos de Cine ---
  { id: 'p1', title: 'Dune: Parte Dos', url: 'https://image.tmdb.org/t/p/w500/v2NN1TMK3ifuiEyawa3ukkcSOUQ.jpg', type: 'poster' },
  { id: 'p2', title: 'Interestelar', url: 'https://image.tmdb.org/t/p/w500/d1QKiYtceF3GDtxvTFXFAqwwah9.jpg', type: 'poster' },
  { id: 'p3', title: 'Spider-Man: Multiverso', url: 'https://image.tmdb.org/t/p/w500/37WcNMgNOMxdhT87MFl7tq7FM1.jpg', type: 'poster' },
  { id: 'p4', title: 'Oppenheimer', url: 'https://image.tmdb.org/t/p/w500/mJRUREPjTqqMEKwEiM2sdmIGngz.jpg', type: 'poster' },
  { id: 'p5', title: 'The Dark Knight', url: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg', type: 'poster' },
  { id: 'p6', title: 'The Batman', url: 'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg', type: 'poster' },
  { id: 'p7', title: 'Deadpool y Wolverine', url: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg', type: 'poster' },
  { id: 'p8', title: 'Avengers: Endgame', url: 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg', type: 'poster' },
  { id: 'p9', title: 'Avatar: El Camino del Agua', url: 'https://image.tmdb.org/t/p/w500/bqbFHw6UeB8jW3Fw5nK7t7bE1YQ.jpg', type: 'poster' },
  { id: 'p10', title: 'Gladiador', url: 'https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg', type: 'poster' },
  { id: 'p11', title: 'Matrix', url: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg', type: 'poster' },
  { id: 'p12', title: 'El Origen (Inception)', url: 'https://image.tmdb.org/t/p/w500/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg', type: 'poster' },
  { id: 'p13', title: 'Guasón (Joker)', url: 'https://image.tmdb.org/t/p/w500/v0Bisw22pY16i9iKqGsmY9aUe7b.jpg', type: 'poster' },
  { id: 'p14', title: 'Intensamente 2', url: 'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg', type: 'poster' },
  { id: 'p15', title: 'Coco', url: 'https://image.tmdb.org/t/p/w500/7qNy9b35y3pY456f91XQ4bF357E.jpg', type: 'poster' },
  { id: 'p16', title: 'Super Mario Bros', url: 'https://image.tmdb.org/t/p/w500/qNBAXBIQlnOThrVvA6mA2B5ggV6.jpg', type: 'poster' },
  { id: 'p17', title: 'Harry Potter', url: 'https://image.tmdb.org/t/p/w500/wuMc08IPKEatf9rnMNYrMHxqxmp.jpg', type: 'poster' },
  { id: 'p18', title: 'El Conjuro', url: 'https://image.tmdb.org/t/p/w500/wVYREutTvI2COtxqPPia13q98mg.jpg', type: 'poster' },
  { id: 'p19', title: 'John Wick 4', url: 'https://image.tmdb.org/t/p/w500/vZloFAK7NKnMGKEslUsDdmsQ5rm.jpg', type: 'poster' },
  { id: 'p20', title: 'El Padrino', url: 'https://image.tmdb.org/t/p/w500/gVoJszZc8eG0zPZfK6d1hF9xWb.jpg', type: 'poster' },
  { id: 'p21', title: 'El Club de la Pelea', url: 'https://image.tmdb.org/t/p/w500/8G5vQyJbWd6nS374n2R5z6m4Z1v.jpg', type: 'poster' },
  { id: 'p22', title: 'Titanic', url: 'https://image.tmdb.org/t/p/w500/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg', type: 'poster' },
  { id: 'p23', title: 'Godzilla y Kong', url: 'https://image.tmdb.org/t/p/w500/2YqZ6IyFk7menirwziJvfoVvSOh.jpg', type: 'poster' },

  // --- Series Aclamadas y Populares ---
  { id: 'p24', title: 'From (Origen)', url: 'https://image.tmdb.org/t/p/w500/7pHMZ6EsZfs2qZu0Lv2UGtTo5MU.jpg', type: 'poster' },
  { id: 'p25', title: 'Arcane', url: 'https://image.tmdb.org/t/p/w500/87C0wecB8bHb1PsrKBI4kJiEkgV.jpg', type: 'poster' },
  { id: 'p26', title: 'Breaking Bad', url: 'https://image.tmdb.org/t/p/w500/anFx9aTOOYqgS3v7x3R84Kz67ly.jpg', type: 'poster' },
  { id: 'p27', title: 'The Last of Us', url: 'https://image.tmdb.org/t/p/w500/tNQWO6cNzQYCyvw36mUcAQQyf5F.jpg', type: 'poster' },
  { id: 'p28', title: 'Stranger Things', url: 'https://image.tmdb.org/t/p/w500/x2LSRK2Cm7MZhjluni1msVJ3wDF.jpg', type: 'poster' },
  { id: 'p29', title: 'Cyberpunk: Edgerunners', url: 'https://image.tmdb.org/t/p/w500/7jswLpmZ218tT6N7BslX2x7kI5F.jpg', type: 'poster' },
  { id: 'p30', title: 'The Boys', url: 'https://image.tmdb.org/t/p/w500/2zmTngn1tYC1AvfnrFLhxeD82hz.jpg', type: 'poster' },
  { id: 'p31', title: 'Juego de Tronos', url: 'https://image.tmdb.org/t/p/w500/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg', type: 'poster' },
  { id: 'p32', title: 'La Casa del Dragón', url: 'https://image.tmdb.org/t/p/w500/7QMsOTMUswlwxJP0rTTZfmz2tX2.jpg', type: 'poster' },

  // --- Portadas Horizontales Cinemáticas / Backdrops ---
  { id: 'b1', title: 'Dune Portada', url: 'https://image.tmdb.org/t/p/w780/eZ239CUp1d6OryZEBPnO2n87gMG.jpg', type: 'backdrop' },
  { id: 'b2', title: 'Interstellar Portada', url: 'https://image.tmdb.org/t/p/w780/8sNiAPPYU14PUepFNeSNGUTiHW.jpg', type: 'backdrop' },
  { id: 'b3', title: 'Oppenheimer Portada', url: 'https://image.tmdb.org/t/p/w780/neeNHeXjMF5fXoCJRsOmkNGC7q.jpg', type: 'backdrop' },
  { id: 'b4', title: 'The Dark Knight Portada', url: 'https://image.tmdb.org/t/p/w780/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg', type: 'backdrop' },
  { id: 'b5', title: 'Arcane Portada', url: 'https://image.tmdb.org/t/p/w780/5cvnxEHT3e39DvT6ARw4GNCFrB0.jpg', type: 'backdrop' },
  { id: 'b6', title: 'Breaking Bad Portada', url: 'https://image.tmdb.org/t/p/w780/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg', type: 'backdrop' },
  { id: 'b7', title: 'The Last of Us Portada', url: 'https://image.tmdb.org/t/p/w780/lY2DhbA7Hy44fAKddr06UrXWWaQ.jpg', type: 'backdrop' },
];

export const GoogleAuthGate: React.FC<GoogleAuthGateProps> = ({
  onSuccess,
  moviePosters = [],
}) => {
  const [googleEmail, setGoogleEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [adminPin, setAdminPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGooglePopupLoading, setIsGooglePopupLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  // Estados de permanencia bloqueante
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [suspendedUser, setSuspendedUser] = useState<User | null>(null);

  // Estado para verificación de PIN cuando una cuenta administrativa inicia sesión vía Google Popup
  const [pendingSuperAdmin, setPendingSuperAdmin] = useState<{
    uid: string;
    email: string;
    displayName: string | null;
    photoURL: string | null;
  } | null>(null);

  // Estado para verificación de PIN en flujo de correo manual
  const [manualPinEmail, setManualPinEmail] = useState<string | null>(null);

  // Unificar pósteres proporcionados dinámicamente con el catálogo predeterminado
  const postersList = useMemo(() => {
    if (moviePosters && moviePosters.length > 0) {
      const dynamicItems: PosterItem[] = moviePosters.map((url, i) => ({
        id: `dyn-${i}`,
        title: 'Cinema Poster',
        url,
        type: 'poster',
      }));
      return [...dynamicItems, ...CINEMA_POSTERS_AND_COVERS];
    }
    return CINEMA_POSTERS_AND_COVERS;
  }, [moviePosters]);

  // Distribuir pósteres y portadas en 6 columnas paralelas equilibradas
  const posterColumns = useMemo(() => {
    const numCols = 6;
    const cols: PosterItem[][] = Array.from({ length: numCols }, () => []);
    postersList.forEach((item, index) => {
      cols[index % numCols].push(item);
    });
    return cols;
  }, [postersList]);

  // Verificar si ya hay una sesión en espera o suspendida
  useEffect(() => {
    const active = getCurrentUser();
    if (active) {
      if (active.status === 'PENDING') {
        setPendingUser(active);
      } else if (active.status === 'SUSPENDED') {
        setSuspendedUser(active);
      }
    }

    // Verificar si el usuario proviene de un flujo de redirección de Google
    checkRedirectAuthResult()
      .then(async (firebaseUser) => {
        if (firebaseUser && firebaseUser.email) {
          if (isSuperAdmin(firebaseUser.email)) {
            setPendingSuperAdmin({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            });
            setSuccessMessage('Identidad verificada con Google. Ingresa tu PIN de Seguridad.');
          } else {
            const user = await authenticateWithVerifiedGoogleUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            });
            onSuccess(user);
          }
        }
      })
      .catch(() => {});
  }, [onSuccess]);

  // Verificar limitación de intentos y PIN al cargar
  useEffect(() => {
    const rate = checkRateLimit();
    const pinRate = checkAdminPinRateLimit();
    const maxRemaining = Math.max(rate.remainingSeconds || 0, pinRate.remainingSeconds || 0);
    if (maxRemaining > 0) {
      setCooldownSeconds(maxRemaining);
    }
  }, []);

  // Temporizador de enfriamiento ante fuerza bruta
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setErrorMessage(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  /**
   * INICIO DE SESIÓN REAL CON GOOGLE (OAuth 2.0 / Firebase Auth)
   * Abre la ventana nativa oficial de selección de cuentas de Google
   */
  const handleRealGoogleSignIn = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setPendingSuperAdmin(null);
    setManualPinEmail(null);
    setIsGooglePopupLoading(true);

    try {
      const firebaseUser = await loginWithGoogle();
      if (!firebaseUser.email) {
        throw new Error('La cuenta de Google seleccionada no proporcionó un correo electrónico válido.');
      }

      // Si la cuenta requiere PIN de Seguridad adicional
      if (isSuperAdmin(firebaseUser.email)) {
        setPendingSuperAdmin({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });
        setSuccessMessage('Identidad verificada con Google. Ingresa tu PIN de Seguridad.');
        return;
      }

      // Autenticación de usuario estándar con credenciales de Google
      const user = await authenticateWithVerifiedGoogleUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      });

      if (user.status === 'PENDING') {
        setPendingUser(user);
        setSuccessMessage('Solicitud registrada. En espera de autorización del Administrador.');
        return;
      }

      if (user.status === 'SUSPENDED') {
        setSuspendedUser(user);
        setErrorMessage('Esta cuenta se encuentra suspendida por el Administrador.');
        return;
      }

      setSuccessMessage(`Bienvenido, ${user.name}`);
      setTimeout(() => {
        onSuccess(user);
      }, 500);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Autenticación cancelada: La ventana de Google se cerró antes de completar.');
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMessage('El navegador bloqueó la ventana emergente de Google. Puedes ingresar directamente con tu correo a continuación.');
      } else if (err.code === 'auth/unauthorized-domain') {
        const domain = typeof window !== 'undefined' ? window.location.hostname : 'tu-app.vercel.app';
        setErrorMessage(
          `Dominio no autorizado en Firebase (${domain}). Para habilitar el inicio de sesión en tu despliegue de Vercel, ve a Consola de Firebase -> Authentication -> Settings -> Authorized Domains y agrega "${domain}".`
        );
      } else if (err.code === 'auth/operation-not-allowed') {
        setErrorMessage('El proveedor Google no está habilitado en tu proyecto Firebase. Actívalo en la consola de Firebase en Authentication -> Sign-in method.');
      } else {
        setErrorMessage(err.message || 'Error en la autenticación con Google.');
      }
    } finally {
      setIsGooglePopupLoading(false);
    }
  };

  /**
   * Confirmación del PIN tras autenticarse con la cuenta de Google
   */
  const handleConfirmSuperAdminPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingSuperAdmin) return;
    if (!adminPin.trim()) {
      setErrorMessage('Ingresa el PIN de Seguridad.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const user = await authenticateWithVerifiedGoogleUser(
        pendingSuperAdmin,
        adminPin.trim()
      );

      setSuccessMessage(`Acceso concedido. Bienvenido, ${user.name}`);
      setTimeout(() => {
        onSuccess(user);
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'PIN de Seguridad incorrecto.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Autenticación manual mediante correo Google (respaldo si el navegador bloquea popups)
   */
  const handleManualAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setPendingUser(null);
    setSuspendedUser(null);

    const targetEmail = manualPinEmail || googleEmail;
    const validation = validateGoogleEmail(targetEmail);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Solo se permiten correos oficiales de Google (@gmail.com).');
      return;
    }

    const cleanEmail = validation.cleanEmail;

    // Si la cuenta requiere PIN de seguridad adicional y aún no estamos en el paso del PIN
    if (isSuperAdmin(cleanEmail) && !manualPinEmail) {
      setManualPinEmail(cleanEmail);
      setAdminPin('');
      return;
    }

    // Si la cuenta requiere PIN de seguridad
    const pinToSubmit = isSuperAdmin(cleanEmail) ? adminPin.trim() : undefined;
    if (isSuperAdmin(cleanEmail) && !pinToSubmit) {
      setErrorMessage('Ingresa tu PIN de Seguridad.');
      return;
    }

    setIsLoading(true);
    try {
      const user = await authenticateWithGoogle(
        cleanEmail,
        userName,
        undefined,
        pinToSubmit
      );

      if (user.status === 'PENDING') {
        setPendingUser(user);
        setSuccessMessage('Solicitud registrada. En espera de autorización del Administrador.');
        return;
      }

      if (user.status === 'SUSPENDED') {
        setSuspendedUser(user);
        setErrorMessage('Esta cuenta se encuentra suspendida por el Administrador.');
        return;
      }

      setSuccessMessage(`Bienvenido, ${user.name}`);
      setTimeout(() => {
        onSuccess(user);
      }, 500);
    } catch (err: any) {
      const rate = checkRateLimit();
      const pinRate = checkAdminPinRateLimit();
      const maxRemaining = Math.max(rate.remainingSeconds || 0, pinRate.remainingSeconds || 0);
      if (maxRemaining > 0) {
        setCooldownSeconds(maxRemaining);
      }
      setErrorMessage(err.message || 'Error en la verificación de la cuenta de Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckPendingStatus = () => {
    if (!pendingUser) return;
    const active = getCurrentUser();
    if (active && active.status === 'ACTIVE') {
      setPendingUser(null);
      setSuccessMessage('¡Tu cuenta ha sido aprobada!');
      setTimeout(() => {
        onSuccess(active);
      }, 500);
    } else {
      setErrorMessage('Tu cuenta aún está pendiente de aprobación por el Administrador.');
    }
  };

  const handleResetSession = () => {
    logoutUser();
    setPendingUser(null);
    setSuspendedUser(null);
    setPendingSuperAdmin(null);
    setManualPinEmail(null);
    setGoogleEmail('');
    setAdminPin('');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 sm:p-6 bg-black min-h-[100dvh]">
      
      {/* =========================================================================
          FONDO CINEMÁTICO: MOSAICO DE PÓSTERES Y PORTADAS (100% INERTE Y SEGURO)
          ========================================================================= */}
      <div 
        className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none bg-[#050508]"
        aria-hidden="true"
      >
        {/* Grilla inclinada con columnas de marquesina infinita */}
        <div className="absolute -inset-[30%] flex justify-center gap-3 sm:gap-4 md:gap-5 -rotate-2 scale-105 opacity-70 sm:opacity-75 transition-opacity duration-700">
          {posterColumns.map((col, colIdx) => {
            const animClass =
              colIdx % 4 === 0
                ? 'animate-poster-scroll-up'
                : colIdx % 4 === 1
                ? 'animate-poster-scroll-down'
                : colIdx % 4 === 2
                ? 'animate-poster-scroll-up-delayed'
                : 'animate-poster-scroll-down-delayed';

            // Mostrar 4 columnas en móvil para que flanqueen la tarjeta central, 5 en tablet, 6 en escritorio
            const visibilityClass =
              colIdx < 4
                ? 'flex'
                : colIdx < 5
                ? 'hidden sm:flex'
                : 'hidden md:flex';

            return (
              <div
                key={`col-${colIdx}`}
                className={`${visibilityClass} flex-col gap-3 sm:gap-4 shrink-0 w-28 sm:w-36 md:w-44 lg:w-48 ${animClass}`}
                style={{ willChange: 'transform' }}
              >
                {/* Repetición fluida para scroll infinito continuo */}
                {[...col, ...col].map((item, itemIdx) => (
                  <div
                    key={`item-${colIdx}-${item.id}-${itemIdx}`}
                    className={`relative rounded-2xl overflow-hidden shadow-2xl bg-neutral-900 border border-neutral-700/50 shrink-0 ${
                      item.type === 'backdrop' ? 'aspect-[16/9]' : 'aspect-[2/3]'
                    }`}
                  >
                    <img
                      src={item.url}
                      alt=""
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover filter brightness-95 contrast-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/25 pointer-events-none" />
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Resplandor cinemático central (Cinema Box Red Ambient Glow) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-[#FF1A24]/15 rounded-full blur-[140px] pointer-events-none" />

        {/* Gradiente Radial Equilibrado: Oscurece el centro para perfecta legibilidad de la tarjeta sin apagar los pósteres laterales */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(4,4,6,0.85) 0%, rgba(4,4,6,0.60) 40%, rgba(4,4,6,0.25) 70%, rgba(4,4,6,0.80) 100%)',
          }}
        />

        {/* Viñeta sutil en bordes superior e inferior */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/85 pointer-events-none" />
      </div>

      {/* =========================================================================
          TARJETA DE AUTENTICACIÓN (ELEVADA Y TOTALMENTE SEGURA: Z-10)
          ========================================================================= */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-neutral-800/90 bg-neutral-950/95 p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] backdrop-blur-2xl text-neutral-100 my-auto">
        
        {/* Únicamente el Logo Oficial Cinema Box Mbox_Ec */}
        <div className="text-center pb-6 border-b border-neutral-900 flex flex-col items-center">
          <CinemaBoxLogo size="lg" className="justify-center" />
        </div>

        {/* Mensaje de Error Global */}
        {errorMessage && (
          <div className="mt-4 flex items-start gap-2.5 p-3 rounded-xl bg-red-950/80 border border-red-800 text-xs text-red-200 animate-in fade-in">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{errorMessage}</p>
              {cooldownSeconds > 0 && (
                <p className="text-[11px] text-red-300 mt-1">
                  Espera <span className="font-mono font-bold text-white">{cooldownSeconds}s</span> antes de intentar nuevamente.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Mensaje de Éxito Global */}
        {successMessage && (
          <div className="mt-4 flex items-center gap-2.5 p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-200 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* CASO A: CUENTA PENDIENTE DE APROBACIÓN */}
        {pendingUser ? (
          <div className="mt-6 space-y-4 text-center animate-in fade-in">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Clock className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                Cuenta en Espera de Aprobación
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed max-w-xs mx-auto">
                Tu cuenta (<span className="text-white font-mono">{maskEmail(pendingUser.email)}</span>) fue registrada. El Administrador debe autorizar tu acceso antes de ingresar.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleCheckPendingStatus}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs py-3 transition cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Comprobar Estado</span>
              </button>

              <button
                type="button"
                onClick={handleResetSession}
                className="text-xs text-neutral-400 hover:text-white transition py-1 cursor-pointer"
              >
                Ingresar con otra cuenta
              </button>
            </div>
          </div>
        ) : suspendedUser ? (
          /* CASO B: CUENTA SUSPENDIDA */
          <div className="mt-6 space-y-4 text-center animate-in fade-in">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500">
              <Ban className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                Acceso Suspendido
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed max-w-xs mx-auto">
                La cuenta (<span className="text-white font-mono">{maskEmail(suspendedUser.email)}</span>) no tiene permisos de acceso activos.
              </p>
              {suspendedUser.statusReason && (
                <p className="text-xs text-red-400 pt-1 font-medium">
                  Motivo: {suspendedUser.statusReason}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleResetSession}
              className="w-full rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold text-xs py-3 transition cursor-pointer"
            >
              Intentar con otra cuenta
            </button>
          </div>
        ) : manualPinEmail ? (
          /* CASO C1: VERIFICACIÓN DE PIN EN INGRESO MANUAL */
          <form onSubmit={handleManualAuthenticate} className="mt-6 space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800">
              <div className="h-10 w-10 rounded-full bg-red-950/60 border border-red-800/60 flex items-center justify-center font-bold text-red-400">
                <KeyRound className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate">
                    Verificación de Seguridad
                  </span>
                  <span className="text-[10px] uppercase font-mono bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded font-medium border border-neutral-700">
                    2FA
                  </span>
                </div>
                <p className="text-[11px] font-mono text-neutral-400 truncate">
                  {maskEmail(manualPinEmail)}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                <span>PIN de Seguridad</span>
                <span className="text-[10px] text-neutral-500">6 dígitos</span>
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  required
                  autoFocus
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="Introduce tu PIN de Seguridad"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-2.5 text-neutral-400 hover:text-white"
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="submit"
                disabled={isLoading || !adminPin.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-xs py-3 px-4 shadow-xl transition cursor-pointer"
              >
                {isLoading ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Verificar y Acceder</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setManualPinEmail(null);
                  setAdminPin('');
                  setErrorMessage(null);
                }}
                className="text-xs text-neutral-400 hover:text-white transition py-1 cursor-pointer text-center"
              >
                Volver atrás
              </button>
            </div>
          </form>
        ) : pendingSuperAdmin ? (
          /* CASO C2: AUTENTICACIÓN GOOGLE -> VERIFICACIÓN DE PIN */
          <form onSubmit={handleConfirmSuperAdminPin} className="mt-6 space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800">
              {pendingSuperAdmin.photoURL ? (
                <img
                  src={pendingSuperAdmin.photoURL}
                  alt=""
                  className="h-10 w-10 rounded-full border border-red-500/50 object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-red-950/60 border border-red-800/60 flex items-center justify-center font-bold text-red-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate">
                    {pendingSuperAdmin.displayName || 'Cuenta Verificada'}
                  </span>
                  <span className="text-[10px] uppercase font-mono bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded font-medium border border-neutral-700">
                    Seguridad
                  </span>
                </div>
                <p className="text-[11px] font-mono text-neutral-400 truncate">
                  {maskEmail(pendingSuperAdmin.email)}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                <span>PIN de Seguridad</span>
                <span className="text-[10px] text-neutral-500">6 dígitos</span>
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  required
                  autoFocus
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="Introduce tu PIN de Seguridad"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-2.5 text-neutral-400 hover:text-white"
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="submit"
                disabled={isLoading || !adminPin.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-xs py-3 px-4 shadow-xl transition cursor-pointer"
              >
                {isLoading ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Confirmar y Acceder</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResetSession}
                className="text-xs text-neutral-400 hover:text-white transition py-1 cursor-pointer text-center"
              >
                Cancelar y cambiar de cuenta
              </button>
            </div>
          </form>
        ) : (
          /* CASO D: PANTALLA PRINCIPAL CON AUTENTICACIÓN GOOGLE NATIVA Y RESPALDO */
          <div className="mt-6 space-y-5">
            
            {/* BOTÓN OFICIAL DE AUTENTICACIÓN GOOGLE (POPUP OAUTH REAL) */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleRealGoogleSignIn}
                disabled={isGooglePopupLoading || cooldownSeconds > 0}
                className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white hover:bg-neutral-100 disabled:opacity-50 text-neutral-900 font-bold text-xs sm:text-sm py-3.5 px-4 shadow-xl shadow-white/5 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                {isGooglePopupLoading ? (
                  <div className="h-5 w-5 rounded-full border-2 border-neutral-900 border-t-transparent animate-spin" />
                ) : (
                  <>
                    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continuar con Google</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-center text-neutral-400">
                Identifícate de forma segura con tu cuenta oficial de Google
              </p>
            </div>

            {/* Separador Elegante */}
            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-neutral-800" />
              <span className="absolute bg-neutral-950 px-3 text-[10px] uppercase font-mono text-neutral-500 tracking-wider">
                o ingresa con tu correo
              </span>
            </div>

            {/* Formulario de Respaldo por Correo Directo */}
            <form onSubmit={handleManualAuthenticate} className="space-y-3.5">
              
              {/* Campo Correo de Google */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                  <span>Correo de Google</span>
                  <span className="text-[10px] text-neutral-500 font-mono">@gmail.com</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
                  <input
                    type="email"
                    required
                    value={googleEmail}
                    onChange={(e) => {
                      setGoogleEmail(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder="tu.correo@gmail.com"
                    autoComplete="email"
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-900/90 pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-[#FF1A24] focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Nombre de Usuario Opcional */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-300">
                  Nombre o Alias (Opcional)
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900/90 px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-[#FF1A24] focus:outline-none transition"
                />
              </div>

              {/* Botón de Enviar Formulario */}
              <button
                type="submit"
                disabled={isLoading || cooldownSeconds > 0 || !googleEmail.trim()}
                className="mt-1 w-full flex items-center justify-center gap-2 rounded-xl bg-[#FF1A24] hover:bg-[#FF242E] disabled:opacity-40 text-white font-bold text-xs py-2.5 px-4 shadow-xl shadow-red-950/60 transition cursor-pointer"
              >
                {isLoading ? (
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <>
                    <span>Acceder con correo</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Badge de Seguridad Minimalista */}
            <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-neutral-500 border-t border-neutral-900">
              <Lock className="h-3 w-3 text-emerald-500" />
              <span>Autenticación Real con Google · Certificada</span>
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
