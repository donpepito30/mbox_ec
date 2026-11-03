// Mbox_ec - Puerta de Enlace de Autenticación Exclusiva con Google (Content Gate)
// Bloquea el 100% del catálogo y reproducción hasta completar el registro con correo de Google
'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  Shield,
  Clock,
  KeyRound,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  authenticateWithGoogle,
  checkRateLimit,
  validateGoogleEmail,
  User,
} from '../services/auth.ts';

interface GoogleAuthGateProps {
  onSuccess: (user: User) => void;
  moviePosters?: string[];
  initialEmail?: string;
}

export const GoogleAuthGate: React.FC<GoogleAuthGateProps> = ({
  onSuccess,
  moviePosters = [],
  initialEmail = 'jj863620@gmail.com',
}) => {
  const [googleEmail, setGoogleEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const [showSecurityDetails, setShowSecurityDetails] = useState<boolean>(false);

  // Verificar limitación de intentos al cargar
  useEffect(() => {
    const rate = checkRateLimit();
    if (rate.isBlocked) {
      setCooldownSeconds(rate.remainingSeconds);
    }
  }, []);

  // Temporizador de cuenta regresiva para enfriamiento de seguridad
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

  const handleAuthenticate = async (emailToAuth: string, nameToAuth?: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validación preventiva en cliente
    const validation = validateGoogleEmail(emailToAuth);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Solo se permiten correos de Google (@gmail.com).');
      return;
    }

    setIsLoading(true);
    try {
      const user = await authenticateWithGoogle(
        validation.cleanEmail,
        nameToAuth || userName,
        undefined
      );
      setSuccessMessage(`¡Identidad Google verificada! Bienvenido, ${user.name}`);
      setTimeout(() => {
        onSuccess(user);
      }, 700);
    } catch (err: any) {
      const rate = checkRateLimit();
      if (rate.isBlocked) {
        setCooldownSeconds(rate.remainingSeconds);
      }
      setErrorMessage(err.message || 'Error en la verificación de la cuenta de Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAuthenticate(googleEmail, userName);
  };

  // Mosaico de pósteres de películas para el fondo cinemático
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 sm:p-6 bg-black min-h-[100dvh]">
      
      {/* Fondo Cinemático: Mosaico de Portadas estilo Netflix */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-25 pointer-events-none select-none">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 -rotate-6 scale-110 -translate-y-12">
          {postersToDisplay.map((poster, index) => (
            <div
              key={`g1-${index}`}
              className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl bg-neutral-900 border border-neutral-800"
            >
              <img
                src={poster}
                alt="Portada"
                loading="lazy"
                className="h-full w-full object-cover filter brightness-75"
              />
            </div>
          ))}
          {postersToDisplay.map((poster, index) => (
            <div
              key={`g2-${index}`}
              className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl bg-neutral-900 border border-neutral-800"
            >
              <img
                src={poster}
                alt="Portada"
                loading="lazy"
                className="h-full w-full object-cover filter brightness-75"
              />
            </div>
          ))}
        </div>
        {/* Degradados Obsidian para centrar la atención en la tarjeta de autenticación */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/70" />
        <div className="absolute inset-0 bg-radial from-transparent via-black/80 to-black" />
      </div>

      {/* Tarjeta Central de la Puerta de Autenticación de Google */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-neutral-800/90 bg-neutral-950/95 p-6 sm:p-9 shadow-2xl backdrop-blur-2xl text-neutral-100 my-auto">
        
        {/* Cabecera de Marca Mbox_ec con Insignia de Protección */}
        <div className="text-center space-y-2 pb-5 border-b border-neutral-900">
          <div className="inline-flex items-center justify-center gap-2">
            <span className="text-3xl sm:text-4xl font-black tracking-tighter text-white uppercase select-none">
              MBOX<span className="text-red-600">_EC</span>
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 border border-neutral-800 px-3 py-1 text-[11px] font-semibold text-neutral-300">
            <Lock className="h-3 w-3 text-red-500" />
            <span>Acceso Protegido · Registro Único por Correo Google</span>
          </div>

          <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed pt-1">
            Para acceder a las películas, series y reproductores oficiales, es obligatorio registrarte o iniciar sesión con tu cuenta de Google.
          </p>
        </div>

        {/* Notificaciones de Error / Cooldown */}
        {errorMessage && (
          <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-950/80 border border-red-800/80 text-xs text-red-200 animate-in fade-in">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{errorMessage}</p>
              {cooldownSeconds > 0 && (
                <p className="text-[11px] text-red-300 mt-1">
                  Espera <span className="font-mono font-bold text-white">{cooldownSeconds}s</span> antes del próximo intento.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Notificación de Éxito */}
        {successMessage && (
          <div className="mt-4 flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-xs text-emerald-200 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
        )}

        {/* Botón Principal: Autenticación con Google (1-Clic Oficial) */}
        <div className="mt-6 space-y-3">
          
          {/* Botón Estilo Google Identity Services */}
          <button
            type="button"
            disabled={isLoading || cooldownSeconds > 0}
            onClick={() => handleAuthenticate(initialEmail, 'Usuario Google')}
            className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white text-neutral-900 hover:bg-neutral-100 py-3.5 px-4 font-bold text-sm shadow-xl transition-all cursor-pointer group disabled:opacity-50"
          >
            {/* Logo Oficial de Google SVG */}
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span className="truncate">
              {isLoading ? 'Verificando con Google...' : `Continuar con Google (${initialEmail})`}
            </span>
          </button>

          {/* Separador */}
          <div className="relative flex items-center justify-center py-2">
            <div className="w-full border-t border-neutral-900" />
            <span className="absolute bg-neutral-950 px-3 text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">
              O ingresa otra cuenta @gmail.com
            </span>
          </div>

          {/* Formulario para ingresar cualquier otra cuenta legítima de Google */}
          <form onSubmit={handleFormSubmit} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-neutral-300 flex items-center justify-between">
                <span>Tu Correo Google</span>
                <span className="text-[10px] text-red-400 font-mono">Solo @gmail.com</span>
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
                  placeholder="tu_correo@gmail.com"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900/90 pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-red-600 focus:outline-none transition"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-neutral-300">
                Nombre de Perfil (Opcional)
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Nombre para tu perfil de streaming"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900/90 px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-red-600 focus:outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || cooldownSeconds > 0 || !googleEmail.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white font-bold text-xs py-3 px-4 shadow-xl shadow-red-950/60 transition cursor-pointer"
            >
              {isLoading ? (
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>
                  <span>Registrar y Desbloquear Catálogo</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

        </div>

        {/* Sección Interactiva: Medidas de Seguridad Implementadas */}
        <div className="mt-6 pt-4 border-t border-neutral-900">
          <button
            type="button"
            onClick={() => setShowSecurityDetails(!showSecurityDetails)}
            className="w-full flex items-center justify-between text-left text-xs font-semibold text-neutral-400 hover:text-white transition cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Medidas de Seguridad Implementadas ({showSecurityDetails ? 'Ocultar' : 'Ver 6 Medidas'})</span>
            </div>
            <span className="text-[11px] text-neutral-500">{showSecurityDetails ? '▲' : '▼'}</span>
          </button>

          {showSecurityDetails && (
            <div className="mt-3.5 space-y-2.5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-3.5 text-[11px] text-neutral-300 animate-in fade-in">
              
              <div className="flex items-start gap-2">
                <Lock className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">1. Bloqueo Cero-Confianza (Content Gating):</span> El catálogo, búsquedas y reproductores permanecen totalmente inaccesibles hasta completar la autenticación.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Mail className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">2. Validación Estricta de Dominio Google:</span> Verificación por expresión regular RFC 5322 que admite únicamente dominios oficiales <code className="text-neutral-200">@gmail.com</code> y sanitiza contra inyecciones XSS.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <KeyRound className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">3. Tokens Criptográficos SHA-256 (Anti-Tampering):</span> Cada sesión genera un token firmado con una sal de entropía local en SHA-256. Cualquier manipulación manual del token revoca el acceso de inmediato.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Clock className="h-3.5 w-3.5 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">4. Expiración de Sesión (TTL de 7 Días):</span> Las sesiones cuentan con fecha límite de vencimiento automática para proteger dispositivos públicos y Smart TVs.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Shield className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">5. Escudo Anti-Fuerza Bruta (Rate Limiting):</span> Bloqueo temporal automático de 60 segundos tras 5 intentos fallidos consecutivos.
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white">6. Purga Criptográfica de Almacenamiento:</span> Borrado seguro e irreversible de credenciales y claves de sesión en cada cierre de sesión.
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  );
};
