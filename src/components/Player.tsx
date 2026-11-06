// Mbox_ec - Reproductor Minimalista con Contenido en Español (PlayLatinSRC + VidSrc)
// Estilo Puro Netflix / Pluto TV: Cero etiquetas de servidores, cero selectores de aspecto, interfaz ultra limpia
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Play,
  ArrowLeft,
  X,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import { isBraveBrowser, launchInBrave } from '../services/brave.ts';

export interface PlayerProps {
  /** Identificador de TMDb */
  tmdbId: number | string;
  /** Identificador de IMDb (opcional, ej. tt17048514) */
  imdbId?: string;
  /** Tipo de contenido: movie o tv */
  type: 'movie' | 'tv';
  /** Número de temporada para series */
  season?: number;
  /** Número de episodio para series */
  episode?: number;
  /** Título de la película o serie */
  title?: string;
  /** Imagen de fondo para la portada de carga */
  backdropUrl?: string;
  /** Callback para cerrar el reproductor */
  onClose?: () => void;
}

const STREAM_ENDPOINTS = [
  // Proveedor Principal: PlayLatinSRC (Especializado en Español Latino, Castellano y Subtitulado)
  (type: 'movie' | 'tv', id: string | number, s: number, e: number) =>
    type === 'tv'
      ? `https://playlatinsrc.co/custom/serial/${id}/${s}/${e}?color=%23FF1A24`
      : `https://playlatinsrc.co/custom/movie/${id}?color=%23FF1A24`,
  // Respaldo de Alta Disponibilidad: VidSrc Oficial
  (type: 'movie' | 'tv', id: string | number, s: number, e: number) =>
    type === 'tv'
      ? `https://vidsrc.to/embed/tv/${id}/${s}/${e}`
      : `https://vidsrc.to/embed/movie/${id}`,
  // Respaldo Adicional: Espejo AutoEmbed
  (type: 'movie' | 'tv', id: string | number, s: number, e: number) =>
    type === 'tv'
      ? `https://player.autoembed.me/embed/tv/${id}/${s}/${e}`
      : `https://player.autoembed.me/embed/movie/${id}`,
];

export const Player: React.FC<PlayerProps> = ({
  tmdbId,
  imdbId,
  type,
  season = 1,
  episode = 1,
  title,
  backdropUrl,
  onClose,
}) => {
  const [currentSeason, setCurrentSeason] = useState<number>(season);
  const [currentEpisode, setCurrentEpisode] = useState<number>(episode);
  const [providerIndex, setProviderIndex] = useState<number>(0);

  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showPlayOverlay, setShowPlayOverlay] = useState<boolean>(true);
  const [hasTimedOut, setHasTimedOut] = useState<boolean>(false);

  // Integración con Navegador Brave (bloqueo nativo de anuncios y popups)
  const [isBrave, setIsBrave] = useState<boolean>(false);
  const [braveNotice, setBraveNotice] = useState<string | null>(null);

  // Escudo silencioso invisible para absorber el primer clic sin mostrar avisos publicitarios
  const [shieldActive, setShieldActive] = useState<boolean>(true);

  // Estado de Pantalla Completa (compatible con Smart TV y navegadores móviles / iOS Safari)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Detectar si el usuario está actualmente en Brave
  useEffect(() => {
    isBraveBrowser().then(setIsBrave);
  }, []);

  /**
   * Neutralizador global de popups y nuevas pestañas maliciosas
   */
  useEffect(() => {
    const originalOpen = window.open;
    window.open = function () {
      return null;
    };
    return () => {
      window.open = originalOpen;
    };
  }, []);

  /**
   * Resolucion automatica de la fuente de streaming (VidSrc oficial de alta velocidad)
   */
  const getStreamUrl = useCallback((): string => {
    const s = currentSeason || 1;
    const e = currentEpisode || 1;
    const identifier = imdbId || tmdbId;
    const providerFn = STREAM_ENDPOINTS[providerIndex] || STREAM_ENDPOINTS[0];
    return providerFn(type, identifier, s, e);
  }, [type, tmdbId, imdbId, currentSeason, currentEpisode, providerIndex]);

  const streamUrl = getStreamUrl();

  const handleOpenInBrave = () => {
    const res = launchInBrave(streamUrl);
    setBraveNotice(res.message);
    setTimeout(() => {
      setBraveNotice(null);
    }, 4500);
  };

  const clearTimer = useCallback(() => {
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    setIsLoading(true);
    setHasTimedOut(false);

    timeoutTimerRef.current = setTimeout(() => {
      setIsLoading(false);
      setHasTimedOut(true);
    }, 7000);
  }, [clearTimer]);

  useEffect(() => {
    setCurrentSeason(season);
    setCurrentEpisode(episode);
    setProviderIndex(0);
    setShowPlayOverlay(true);
    setShieldActive(true);
    setIframeKey((prev) => prev + 1);
    startTimer();
  }, [tmdbId, imdbId, type, season, episode, startTimer]);

  // Sincronizar eventos nativos de fullscreen (Smart TV, Chrome, Firefox)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = Boolean(
        document.fullscreenElement || (document as any).webkitFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  /**
   * Alternar pantalla completa con soporte dual:
   * 1. Fullscreen API nativo (Smart TVs y PCs de escritorio)
   * 2. Modo pseudo-fullscreen CSS de pantalla completa para móviles (iOS Safari / Android WebView)
   */
  const handleToggleFullscreen = async () => {
    if (!playerContainerRef.current) return;

    try {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        // Intento de Fullscreen API
        if (playerContainerRef.current.requestFullscreen) {
          await playerContainerRef.current.requestFullscreen();
        } else if ((playerContainerRef.current as any).webkitRequestFullscreen) {
          await (playerContainerRef.current as any).webkitRequestFullscreen();
        } else {
          // Fallback para dispositivos móviles sin Fullscreen API estándar
          setIsFullscreen(true);
        }

        // Si es dispositivo móvil, intentar bloquear orientación horizontal para mayor inmersión
        if (typeof screen !== 'undefined' && screen.orientation && 'lock' in screen.orientation) {
          try {
            await (screen.orientation as any).lock('landscape');
          } catch {
            // Ignorar si el navegador no permite bloqueo de orientación
          }
        }
      } else {
        // Salir de pantalla completa
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
        setIsFullscreen(false);

        if (typeof screen !== 'undefined' && screen.orientation && 'unlock' in screen.orientation) {
          try {
            (screen.orientation as any).unlock();
          } catch {}
        }
      }
    } catch {
      // Si la API nativa falla (por ejemplo en iframe o política de permisos móviles), alternamos CSS fullscreen
      setIsFullscreen((prev) => !prev);
    }
  };

  // Navegación con Control Remoto / D-pad de Smart TV y accesos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      switch (e.key) {
        case 'Escape':
        case 'Backspace':
        case 'GoBack':
          if (isFullscreen) {
            e.preventDefault();
            handleToggleFullscreen();
          } else if (onClose) {
            onClose();
          }
          break;

        case 'f':
        case 'F':
          e.preventDefault();
          handleToggleFullscreen();
          break;

        case 'r':
        case 'R':
          e.preventDefault();
          handleReload();
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onClose]);

  const handleSeasonChange = (newSeason: number) => {
    if (newSeason >= 1 && newSeason !== currentSeason) {
      setCurrentSeason(newSeason);
      setShowPlayOverlay(true);
      setShieldActive(true);
      setIframeKey((prev) => prev + 1);
      startTimer();
    }
  };

  const handleEpisodeChange = (newEpisode: number) => {
    if (newEpisode >= 1 && newEpisode !== currentEpisode) {
      setCurrentEpisode(newEpisode);
      setShowPlayOverlay(true);
      setShieldActive(true);
      setIframeKey((prev) => prev + 1);
      startTimer();
    }
  };

  const handleReload = () => {
    setProviderIndex((prev) => (prev + 1) % STREAM_ENDPOINTS.length);
    setShieldActive(true);
    setIframeKey((prev) => prev + 1);
    startTimer();
  };

  const handleIframeError = () => {
    setProviderIndex((prev) => (prev + 1) % STREAM_ENDPOINTS.length);
    setIframeKey((prev) => prev + 1);
    startTimer();
  };

  const handleIframeLoad = () => {
    clearTimer();
    setIsLoading(false);
    setHasTimedOut(false);
  };

  const handlePlayClick = () => {
    setShowPlayOverlay(false);
  };

  // Absorbe silenciosamente el primer clic de interacción
  const handleAbsorbClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShieldActive(false);
  };

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return (
    <div className="w-full space-y-3 select-none">
      
      {/* Contenedor del Reproductor Estilo Netflix / Pluto TV */}
      <div
        ref={playerContainerRef}
        className={`relative overflow-hidden bg-black shadow-2xl flex flex-col transition-all duration-300 ${
          isFullscreen
            ? 'fixed inset-0 z-[9999] h-[100dvh] w-screen rounded-none border-0 p-0 m-0 bg-black flex flex-col justify-between'
            : 'rounded-2xl border border-neutral-900'
        }`}
      >
        
        {/* Barra Superior Minimalista (Sin nombres de servidores, sin aspecto) */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-b from-neutral-900/90 to-black/95 border-b border-neutral-900/80 z-30">
          <div className="flex items-center gap-3 min-w-0">
            {onClose && (
              <button
                type="button"
                tabIndex={0}
                onClick={onClose}
                className="p-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800 transition cursor-pointer"
                title="Volver"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse shrink-0" />
            <h2 className="text-xs sm:text-sm md:text-base font-bold text-white truncate tracking-tight">
              {title || (type === 'tv' ? 'Serie' : 'Película')}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">

            {/* Integración con Navegador Brave (Reproducción Sin Publicidad) */}
            {isBrave ? (
              <div
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-orange-950/40 border border-orange-800/60 text-orange-400 text-xs font-bold"
                title="Reproduciendo en Brave Browser con escudo publicitario activo"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-orange-400" />
                <span className="hidden md:inline">Sin Anuncios (Brave)</span>
              </div>
            ) : (
              <button
                type="button"
                tabIndex={0}
                onClick={handleOpenInBrave}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs shadow-md shadow-orange-950/50 transition cursor-pointer"
                title="Abrir en el Navegador Brave para ver sin anuncios ni ventanas emergentes"
              >
                <Shield className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Abrir en Brave</span>
                <span className="md:hidden">Brave</span>
              </button>
            )}

            {/* Botón de Pantalla Completa (Optimizado para móvil y Smart TV) */}
            <button
              type="button"
              tabIndex={0}
              onClick={handleToggleFullscreen}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800 transition cursor-pointer text-xs font-medium"
              title={isFullscreen ? 'Salir de Pantalla Completa' : 'Pantalla Completa'}
            >
              {isFullscreen ? (
                <>
                  <Minimize className="h-4 w-4 text-[#FF1A24]" />
                  <span className="hidden sm:inline">Salir</span>
                </>
              ) : (
                <>
                  <Maximize className="h-4 w-4 text-[#FF1A24]" />
                  <span className="hidden sm:inline">Pantalla Completa</span>
                </>
              )}
            </button>

            {/* Recargar */}
            <button
              type="button"
              tabIndex={0}
              onClick={handleReload}
              className="p-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800 transition cursor-pointer"
              title="Recargar reproductor"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-[#FF1A24]' : ''}`} />
            </button>

            {isFullscreen && (
              <button
                type="button"
                tabIndex={0}
                onClick={handleToggleFullscreen}
                className="p-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800 transition cursor-pointer"
                title="Cerrar pantalla completa"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Notificación flotante de Brave */}
        {braveNotice && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-950 border border-orange-700 text-orange-100 text-xs font-semibold shadow-2xl backdrop-blur-md animate-in fade-in">
            <ShieldCheck className="h-4 w-4 text-orange-400 shrink-0" />
            <span>{braveNotice}</span>
          </div>
        )}

        {/* Controles Limpios de Temporada y Episodio para Series */}
        {type === 'tv' && (
          <div className="flex items-center justify-between px-4 py-2 bg-neutral-950 border-b border-neutral-900 text-xs z-20">
            <div className="flex items-center gap-4">
              {/* Selector de Temporada */}
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-400">Temporada</span>
                <button
                  type="button"
                  tabIndex={0}
                  disabled={currentSeason <= 1}
                  onClick={() => handleSeasonChange(currentSeason - 1)}
                  className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 disabled:opacity-20 text-white transition cursor-pointer"
                  title="Temporada anterior"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="font-bold text-red-500 px-1.5 tabular-nums">
                  {currentSeason}
                </span>
                <button
                  type="button"
                  tabIndex={0}
                  onClick={() => handleSeasonChange(currentSeason + 1)}
                  className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 text-white transition cursor-pointer"
                  title="Siguiente temporada"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Selector de Episodio */}
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-400">Episodio</span>
                <button
                  type="button"
                  tabIndex={0}
                  disabled={currentEpisode <= 1}
                  onClick={() => handleEpisodeChange(currentEpisode - 1)}
                  className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 disabled:opacity-20 text-white transition cursor-pointer"
                  title="Episodio anterior"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="font-bold text-red-500 px-1.5 tabular-nums">
                  {currentEpisode}
                </span>
                <button
                  type="button"
                  tabIndex={0}
                  onClick={() => handleEpisodeChange(currentEpisode + 1)}
                  className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 text-white transition cursor-pointer"
                  title="Siguiente episodio"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <span className="text-neutral-500 font-mono text-[11px] tracking-wider">
              T{currentSeason}:E{currentEpisode}
            </span>
          </div>
        )}

        {/* Viewport del Video */}
        <div
          className={`relative w-full bg-black overflow-hidden flex items-center justify-center flex-1 transition-all duration-300 ${
            isFullscreen
              ? 'h-full flex-1'
              : 'aspect-video min-h-[260px] sm:min-h-[400px] md:min-h-[480px] lg:min-h-[560px]'
          }`}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            
            {/* Indicador de Carga Minimalista */}
            {isLoading && !hasTimedOut && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/85 backdrop-blur-xs text-white space-y-3 pointer-events-none">
                <div className="h-10 w-10 rounded-full border-3 border-red-600 border-t-transparent animate-spin" />
              </div>
            )}

            {/* Aviso de Recarga si tarda demasiado */}
            {hasTimedOut && (
              <div className="absolute top-3 right-3 z-30 flex items-center gap-2 p-2 rounded-xl bg-neutral-950/90 border border-neutral-800 text-xs text-neutral-300 shadow-xl backdrop-blur-sm">
                <button
                  type="button"
                  tabIndex={0}
                  onClick={handleReload}
                  className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition cursor-pointer"
                >
                  Recargar
                </button>
              </div>
            )}

            {/* Portada Inicial "Toca para Reproducir" */}
            {showPlayOverlay && (
              <div 
                tabIndex={0}
                onClick={handlePlayClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handlePlayClick();
                  }
                }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-[2px] p-6 text-center cursor-pointer transition-all duration-300 hover:bg-black/65 group focus:outline-none focus:ring-4 focus:ring-red-600"
                style={
                  backdropUrl
                    ? {
                        backgroundImage: `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.85)), url(${backdropUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }
                    : undefined
                }
              >
                <div className="flex flex-col items-center gap-4 max-w-sm pointer-events-none">
                  <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-red-600 text-white shadow-2xl shadow-red-950 group-hover:scale-110 group-hover:bg-red-500 transition-all duration-300">
                    <Play className="h-8 w-8 sm:h-10 sm:w-10 fill-white text-white translate-x-1" />
                  </div>

                  <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    {title || 'Reproducir'}
                  </h3>
                </div>
              </div>
            )}

            {/* Capa Anti-Anuncios (#ad-overlay) para neutralizar el primer clic */}
            {!showPlayOverlay && shieldActive && (
              <div
                id="ad-overlay"
                tabIndex={0}
                onClick={handleAbsorbClick}
                onTouchStart={handleAbsorbClick}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleAbsorbClick(e as any);
                  }
                }}
                className="absolute inset-0 z-15 cursor-pointer bg-transparent"
              />
            )}

            {/* Iframe del Reproductor AutoEmbed */}
            <iframe
              key={`${iframeKey}-${providerIndex}`}
              src={streamUrl}
              title={title || 'Reproductor'}
              className="h-full w-full border-0"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture; screen-wake-lock"
              referrerPolicy="origin"
              allowFullScreen
              onLoad={handleIframeLoad}
              onError={handleIframeError}
            />
          </div>
        </div>

      </div>

    </div>
  );
};
