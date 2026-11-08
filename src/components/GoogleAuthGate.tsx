// Mbox_ec - Puerta de Enlace de Autenticación Exclusiva con Google (Content Gate)
// Integración Real con Google Firebase Auth (OAuth Popup) y Respaldo Seguro
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
import { loginWithGoogle } from '../services/firebase.ts';
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
  const [isGooglePopupLoading, setIsGooglePopupLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);

  // Estados de permanencia bloqueante
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [suspendedUser, setSuspendedUser] = useState<User | null>(null);

  // Estado para verificación de PIN cuando el Propietario inicia sesión vía Google Popup
  const [pendingSuperAdmin, setPendingSuperAdmin] = useState<{
    uid: string;
    email: string;
    displayName: string | null;
    photoURL: string | null;
  } | null>(null);

  // Detecta si el correo ingresado manualmente es la cuenta de Super Admin
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

  /**
   * INICIO DE SESIÓN REAL CON GOOGLE (OAuth 2.0 / Firebase Auth)
   * Abre la ventana nativa oficial de selección de cuentas de Google
   */
  const handleRealGoogleSignIn = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setPendingSuperAdmin(null);
    setIsGooglePopupLoading(true);

    try {
      const firebaseUser = await loginWithGoogle();
      if (!firebaseUser.email) {
        throw new Error('La cuenta de Google seleccionada no proporcionó un correo electrónico válido.');
      }

      // Si la cuenta es del Propietario / Super Admin, solicitar su PIN Maestro de Seguridad
      if (isSuperAdmin(firebaseUser.email)) {
        setPendingSuperAdmin({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
        });
        setSuccessMessage('Cuenta de Propietario autenticada con Google. Ingresa tu PIN de Seguridad.');
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
        setErrorMessage('Tu navegador bloqueó la ventana emergente de Google. Por favor habilita ventanas emergentes o usa el acceso manual.');
      } else {
        setErrorMessage(err.message || 'Error en la autenticación con Google.');
      }
    } finally {
      setIsGooglePopupLoading(false);
    }
  };

  /**
   * Confirmación del PIN Maestro tras autenticarse con la cuenta de Google del Propietario
   */
  const handleConfirmSuperAdminPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingSuperAdmin) return;
    if (!adminPin.trim()) {
      setErrorMessage('Ingresa el PIN Maestro de Seguridad del Propietario.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const user = await authenticateWithVerifiedGoogleUser(
        pendingSuperAdmin,
        adminPin.trim()
      );

      setSuccessMessage(`Bienvenido, Propietario ${user.name}`);
      setTimeout(() => {
        onSuccess(user);
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'PIN Maestro incorrecto.');
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

    const validation = validateGoogleEmail(googleEmail);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Solo se permiten correos oficiales de Google (@gmail.com).');
      return;
    }

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
        ) : pendingSuperAdmin ? (
          /* CASO C: AUTENTICACIÓN GOOGLE DEL PROPIETARIO -> SOLICITUD DE PIN MAESTRO */
          <form onSubmit={handleConfirmSuperAdminPin} className="mt-6 space-y-4 animate-in fade-in">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-red-950/30 border border-red-900/50">
              {pendingSuperAdmin.photoURL ? (
                <img
                  src={pendingSuperAdmin.photoURL}
                  alt=""
                  className="h-10 w-10 rounded-full border border-red-500 object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-red-600 flex items-center justify-center font-bold text-white">
                  M
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate">
                    {pendingSuperAdmin.displayName || 'Propietario'}
                  </span>
                  <span className="text-[10px] uppercase font-mono bg-red-600/40 text-red-300 px-1.5 py-0.2 rounded font-bold">
                    Super Admin
                  </span>
                </div>
                <p className="text-[11px] font-mono text-neutral-400 truncate">
                  {pendingSuperAdmin.email}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300 flex items-center justify-between">
                <span>PIN Maestro de Seguridad</span>
                <span className="text-[10px] text-neutral-500">6 dígitos</span>
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  required
                  autoFocus
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
                    <span>Confirmar y Acceder como Propietario</span>
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
                o ingresa tu correo
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

              {/* Si es el Propietario, se solicita el PIN Maestro */}
              {isOwnerEmail ? (
                <div className="space-y-1.5 p-3 rounded-2xl bg-red-950/20 border border-red-900/40 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-red-400">
                    <span className="flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>PIN del Propietario</span>
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
                /* Nombre de Usuario Opcional */
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
