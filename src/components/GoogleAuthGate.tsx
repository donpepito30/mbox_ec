// Mbox_ec - Puerta de Enlace de Autenticación Exclusiva con Google (Content Gate)
// Minimalista, estilo Netflix: Únicamente el logo, sin frases ni textos excesivos
// Máxima Seguridad: El correo del dueño NO está predeterminado, se exige PIN Maestro para la cuenta de Propietario
'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import {
  authenticateWithGoogle,
  checkRateLimit,
  checkAdminPinRateLimit,
  validateGoogleEmail,
  getCurrentUser,
  logoutUser,
  isSuperAdmin,
  User,
} from '../services/auth.ts';
import { CinemaBoxLogo } from './CinemaBoxLogo.tsx';

interface GoogleAuthGateProps {
  onSuccess: (user: User) => void;
  moviePosters?: string[];
}

export const GoogleAuthGate: React.FC<GoogleAuthGateProps> = ({
  onSuccess,
  moviePosters = [],
}) => {
  const [googleEmail, setGoogleEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [adminPin, setAdminPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  // Estados de permanencia bloqueante
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [suspendedUser, setSuspendedUser] = useState<User | null>(null);

  // Detecta si el correo ingresado es la cuenta de Super Admin
  const isOwnerEmail = isSuperAdmin(googleEmail);

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
  }, []);

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

  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setPendingUser(null);
    setSuspendedUser(null);

    const validation = validateGoogleEmail(googleEmail);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Solo se permiten correos oficiales de Google (@gmail.com).');
      return;
    }

    // Si es la cuenta del propietario, validar que haya ingresado el PIN
    if (isOwnerEmail && !adminPin.trim()) {
      setErrorMessage('Esta es la cuenta del Propietario. Ingresa tu PIN de Seguridad.');
      return;
    }

    setIsLoading(true);
    try {
      const user = await authenticateWithGoogle(
        validation.cleanEmail,
        userName,
        undefined,
        isOwnerEmail ? adminPin.trim() : undefined
      );

      // Si el usuario requiere aprobación del administrador
      if (user.status === 'PENDING') {
        setPendingUser(user);
        setSuccessMessage('Solicitud registrada. En espera de autorización del Administrador.');
        return;
      }

      // Si el usuario está suspendido
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
    setGoogleEmail('');
    setAdminPin('');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const defaultPosters = [
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=500&auto=format&fit=crop&q=80',
  ];

  const postersToDisplay = moviePosters.length > 0 ? moviePosters.slice(0, 16) : defaultPosters;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 sm:p-6 bg-[#08080A] min-h-[100dvh]">
      
      {/* Fondo Cinemático Minimalista */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-20 pointer-events-none select-none">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 -rotate-3 scale-105">
          {postersToDisplay.map((poster, index) => (
            <div
              key={`p1-${index}`}
              className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl bg-neutral-900 border border-neutral-800"
            >
              <img
                src={poster}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover filter brightness-70"
              />
            </div>
          ))}
          {postersToDisplay.map((poster, index) => (
            <div
              key={`p2-${index}`}
              className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl bg-neutral-900 border border-neutral-800"
            >
              <img
                src={poster}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover filter brightness-70"
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#08080A] via-[#08080A]/90 to-[#08080A]/80" />
      </div>

      {/* Tarjeta de Autenticación Minimalista */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-neutral-800/80 bg-neutral-950/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl text-neutral-100 my-auto">
        
        {/* Únicamente el Logo Oficial Cinema Box Mbox_Ec */}
        <div className="text-center pb-6 border-b border-neutral-900 flex flex-col items-center">
          <CinemaBoxLogo size="lg" className="justify-center" />
        </div>

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
                Tu cuenta (<span className="text-white font-mono">{pendingUser.email}</span>) fue registrada. El Administrador debe autorizar tu acceso antes de ingresar.
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
                La cuenta (<span className="text-white font-mono">{suspendedUser.email}</span>) no tiene permisos de acceso activos.
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
        ) : (
          /* CASO C: FORMULARIO LIMPIO DE ACCESO */
          <form onSubmit={handleAuthenticate} className="mt-6 space-y-4">
            
            {/* Mensaje de Error */}
            {errorMessage && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-950/80 border border-red-800 text-xs text-red-200 animate-in fade-in">
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

            {/* Mensaje de Éxito */}
            {successMessage && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-xs text-emerald-200 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{successMessage}</span>
              </div>
            )}

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

            {/* Si es el Propietario, se solicita el PIN Maestro */}
            {isOwnerEmail ? (
              <div className="space-y-1.5 p-3 rounded-2xl bg-red-950/20 border border-red-900/40 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-red-400">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>PIN de Seguridad del Propietario</span>
                  </span>
                  <span className="text-[10px] uppercase font-mono bg-red-600/30 px-1.5 py-0.5 rounded text-red-300">
                    Super Admin
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    required
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    placeholder="Introduce tu PIN Maestro"
                    className="w-full rounded-xl border border-red-800/80 bg-neutral-900 pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-red-500 focus:outline-none transition"
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
            ) : (
              /* Nombre de Usuario Opcional para nuevos registros */
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
            )}

            {/* Botón de Enviar */}
            <button
              type="submit"
              disabled={isLoading || cooldownSeconds > 0 || !googleEmail.trim()}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-[#FF1A24] hover:bg-[#FF242E] disabled:opacity-40 text-white font-bold text-xs py-3 px-4 shadow-xl shadow-red-950/60 transition cursor-pointer"
            >
              {isLoading ? (
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>
                  <span>Continuar</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {/* Badge de Seguridad Minimalista */}
            <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-neutral-500">
              <Lock className="h-3 w-3 text-emerald-500" />
              <span>Acceso Seguro · Verificación con Google</span>
            </div>

          </form>
        )}

      </div>

    </div>
  );
};
