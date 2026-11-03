// Mbox_ec - Pantalla Profesional de Autenticación y Registro por Correo
// Fondo Cinemático con Mosaico de Portadas de Películas (Estilo Netflix)
'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Film,
  Sparkles,
} from 'lucide-react';
import { loginUser, registerUser, User } from '../services/auth.ts';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  moviePosters?: string[];
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  moviePosters = [],
}) => {
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isRegisterMode && password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);
    try {
      if (isRegisterMode) {
        const user = await registerUser(email, password, name);
        setSuccessMessage('¡Cuenta creada con éxito! Bienvenido a Mbox_ec.');
        setTimeout(() => {
          onSuccess(user);
          onClose();
        }, 600);
      } else {
        const user = await loginUser(email, password);
        setSuccessMessage('Sesión iniciada correctamente.');
        setTimeout(() => {
          onSuccess(user);
          onClose();
        }, 600);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocurrió un error. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('admin@mbox.ec');
    setPassword('123456');
    setIsRegisterMode(false);
    setErrorMessage(null);
  };

  // Mosaico de pósteres de películas para el fondo
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      
      {/* Fondo Mosaico de Portadas de Películas estilo Netflix */}
      <div className="absolute inset-0 z-0 overflow-hidden opacity-30 pointer-events-none select-none">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 -rotate-6 scale-110 -translate-y-10">
          {postersToDisplay.map((poster, index) => (
            <div
              key={index}
              className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl bg-neutral-900 border border-neutral-800"
            >
              <img
                src={poster}
                alt="Portada"
                loading="lazy"
                className="h-full w-full object-cover filter brightness-90"
              />
            </div>
          ))}
          {/* Segunda fila de pósteres para cubrir toda la pantalla */}
          {postersToDisplay.map((poster, index) => (
            <div
              key={`row2-${index}`}
              className="aspect-[2/3] rounded-xl overflow-hidden shadow-2xl bg-neutral-900 border border-neutral-800"
            >
              <img
                src={poster}
                alt="Portada"
                loading="lazy"
                className="h-full w-full object-cover filter brightness-90"
              />
            </div>
          ))}
        </div>
        {/* Degradados cinemáticos para enfocar el formulario */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/60" />
        <div className="absolute inset-0 bg-radial from-transparent via-black/75 to-black" />
      </div>

      {/* Tarjeta de Autenticación */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-neutral-800/90 bg-neutral-950/95 p-6 sm:p-9 shadow-2xl backdrop-blur-2xl text-neutral-100">
        
        {/* Botón Cerrar */}
        <button
          type="button"
          tabIndex={0}
          onClick={onClose}
          className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900/80 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800 transition cursor-pointer"
          title="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Cabecera de Marca */}
        <div className="text-center space-y-1.5 pb-6 border-b border-neutral-900">
          <div className="inline-flex items-center gap-2">
            <span className="text-3xl font-black tracking-tighter text-white uppercase select-none">
              MBOX<span className="text-red-600">_EC</span>
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            {isRegisterMode
              ? 'Crea tu cuenta gratis para guardar tus películas y series'
              : 'Inicia sesión para continuar disfrutando del catálogo'}
          </p>
        </div>

        {/* Pestañas Iniciar Sesión / Registro */}
        <div className="flex bg-neutral-900/80 border border-neutral-800 rounded-xl p-1 mt-6 text-xs font-bold">
          <button
            type="button"
            tabIndex={0}
            onClick={() => {
              setIsRegisterMode(false);
              setErrorMessage(null);
            }}
            className={`flex-1 py-2.5 rounded-lg transition cursor-pointer ${
              !isRegisterMode
                ? 'bg-red-600 text-white shadow-md shadow-red-950'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            tabIndex={0}
            onClick={() => {
              setIsRegisterMode(true);
              setErrorMessage(null);
            }}
            className={`flex-1 py-2.5 rounded-lg transition cursor-pointer ${
              isRegisterMode
                ? 'bg-red-600 text-white shadow-md shadow-red-950'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Crear Cuenta
          </button>
        </div>

        {/* Alerta de Mensaje de Error */}
        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-red-950/80 border border-red-800/80 text-xs text-red-200 animate-in fade-in">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Alerta de Éxito */}
        {successMessage && (
          <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-emerald-950/80 border border-emerald-800/80 text-xs text-emerald-200 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          
          {/* Campo Nombre (solo en registro) */}
          {isRegisterMode && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-neutral-300">
                Nombre Completo
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre o alias"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900/90 pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-red-600 focus:outline-none transition"
                />
              </div>
            </div>
          )}

          {/* Campo Correo Electrónico */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-neutral-300">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900/90 pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-red-600 focus:outline-none transition"
              />
            </div>
          </div>

          {/* Campo Contraseña */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-neutral-300">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900/90 pl-10 pr-10 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-red-600 focus:outline-none transition"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-neutral-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirmar Contraseña (solo en registro) */}
          {isRegisterMode && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-neutral-300">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu contraseña"
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900/90 pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-red-600 focus:outline-none transition"
                />
              </div>
            </div>
          )}

          {/* Botón de Envío */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white shadow-xl shadow-red-950/60 hover:bg-red-500 disabled:opacity-50 transition cursor-pointer"
          >
            {isLoading ? (
              <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <>
                <span>{isRegisterMode ? 'Crear mi Cuenta' : 'Entrar a Mbox_ec'}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Acciones Secundarias */}
        <div className="mt-5 pt-4 border-t border-neutral-900 space-y-2.5 text-center">
          {!isRegisterMode && (
            <button
              type="button"
              onClick={handleFillDemo}
              className="text-[11px] text-neutral-400 hover:text-red-400 transition underline cursor-pointer"
            >
              Rellenar con cuenta demo (admin@mbox.ec)
            </button>
          )}

          <div>
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] font-medium text-neutral-500 hover:text-neutral-300 transition cursor-pointer"
            >
              Continuar explorando como invitado
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
