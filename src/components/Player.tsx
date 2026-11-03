// Mbox_ec - Reproductor Minimalista (SmashyStream & VidSrc)
// Estilo Puro Netflix / Pluto TV: Cero etiquetas descriptivas, interfaz limpia y modo cine
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Play,
  X,
  Smartphone,
  Tv,
} from 'lucide-react';

export type StreamingSource = 'smashy' | 'vidsrc';

export interface PlayerProps {
  /** Identificador de TMDb */
  tmdbId: number | string;
  /** Identificador de IMDb (opcional) */
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
  /** Callback para cerrar el reproductor en modal o vista */
  onClose?: () => void;
}

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

  // Fuente activa: 'smashy' o 'vidsrc'
  const [source, setSource] = useState<StreamingSource>('smashy');

  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showPlayOverlay, setShowPlayOverlay] = useState<boolean>(true);
  const [hasTimedOut, setHasTimedOut] = useState<boolean>(false);

  // Escudo silencioso de absorción de clics fantasma
  const [shieldActive, setShieldActive] = useState<boolean>(true);

  // Selector de aspecto: 16:9 u 9:16
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Neutralizador global de popups en contexto padre
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
   * Genera la URL del reproductor según la fuente seleccionada (Smashy o VidSrc)
   * Respeta la documentación oficial de VidSrc (https://vidsrc.to/embed/movie/{id} y /tv/{id}/{s}/{e})
   */
  const getStreamUrl = useCallback((): string => {
    const s = currentSeason || 1;
    const e = currentEpisode || 1;

    if (source === 'vidsrc') {
      const identifier = imdbId || tmdbId;
      return type === 'tv'
        ? `https://vidsrc.to/embed/tv/${identifier}/${s}/${e}`
        : `https://vidsrc.to/embed/movie/${identifier}`;
    }

    // Fuente SmashyStream
    return type === 'tv'
      ? `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}&season=${s}&episode=${e}`
      : `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}`;
  }, [source, type, tmdbId, imdbId, currentSeason, currentEpisode]);

  const streamUrl = getStreamUrl();

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
    }, 8000);
  }, [clearTimer]);

  useEffect(() => {
    setCurrentSeason(season);
    setCurrentEpisode(episode);
    setShowPlayOverlay(true);
    setShieldActive(true);
    setIframeKey((prev) => prev + 1);
    startTimer();
  }, [tmdbId, imdbId, type, season, episode, source, startTimer]);

  // Listener para estado Fullscreen nativo
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

  // Navegación D-pad / Control Remoto TV
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

        case 'a':
        case 'A':
          e.preventDefault();
          handleToggleAspectRatio();
          break;

        case 's':
        case 'S':
          e.preventDefault();
          setSource((prev) => (prev === 'smashy' ? 'vidsrc' : 'smashy'));
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

  const handleToggleFullscreen = async () => {
    if (!playerContainerRef.current) return;

    try {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        if (playerContainerRef.current.requestFullscreen) {
          await playerContainerRef.current.requestFullscreen();
        } else if ((playerContainerRef.current as any).webkitRequestFullscreen) {
          await (playerContainerRef.current as any).webkitRequestFullscreen();
        }

        if (typeof screen !== 'undefined' && screen.orientation && 'lock' in screen.orientation) {
          try {
            if (aspectRatio === '9:16') {
              await (screen.orientation as any).lock('portrait');
            } else {
              await (screen.orientation as any).lock('landscape');
            }
          } catch {}
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }

        if (typeof screen !== 'undefined' && screen.orientation && 'unlock' in screen.orientation) {
          try {
            (screen.orientation as any).unlock();
          } catch {}
        }
      }
    } catch (err) {
      console.warn('Error en pantalla completa:', err);
    }
  };

  const handleToggleAspectRatio = () => {
    const nextRatio = aspectRatio === '16:9' ? '9:16' : '16:9';
    setAspectRatio(nextRatio);

    if (isFullscreen && typeof screen !== 'undefined' && screen.orientation && 'lock' in screen.orientation) {
      try {
        if (nextRatio === '9:16') {
          (screen.orientation as any).lock('portrait').catch(() => {});
        } else {
          (screen.orientation as any).lock('landscape').catch(() => {});
        }
      } catch {}
    }
  };

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
    setShieldActive(true);
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

  // Absorbe silenciosamente el primer clic publicitario sin mostrar textos
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
        className={`relative overflow-hidden rounded-2xl border border-neutral-900 bg-black shadow-2xl flex flex-col transition-all duration-300 ${
          isFullscreen ? 'h-screen w-screen rounded-none border-0 p-0 m-0 bg-black flex flex-col justify-between' : ''
        }`}
      >
        
        {/* Barra Superior Minimalista */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-b from-neutral-900/90 to-black/95 border-b border-neutral-900 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse shrink-0" />
            <h2 className="text-sm sm:text-base font-black text-white truncate tracking-tight">
              {title || (type === 'tv' ? 'Serie' : 'Película')}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Selector de Fuente Limpio: Smashy o VidSrc */}
            <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                tabIndex={0}
                onClick={() => setSource('smashy')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  source === 'smashy'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Fuente Smashy"
              >
                Smashy
              </button>
              <button
                type="button"
                tabIndex={0}
                onClick={() => setSource('vidsrc')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  source === 'vidsrc'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Fuente VidSrc"
              >
                VidSrc
              </button>
            </div>

            {/* Selector de Formato 16:9 / 9:16 */}
            <button
              type="button"
              tabIndex={0}
              onClick={handleToggleAspectRatio}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-900 text-neutral-300 border border-neutral-800 text-xs font-semibold transition cursor-pointer"
              title="Alternar 16:9 u 9:16"
            >
              {aspectRatio === '16:9' ? (
                <>
                  <Tv className="h-3.5 w-3.5 text-red-500" />
                  <span className="font-mono text-[11px]">16:9</span>
                </>
              ) : (
                <>
                  <Smartphone className="h-3.5 w-3.5 text-red-500" />
                  <span className="font-mono text-[11px]">9:16</span>
                </>
              )}
            </button>

            {/* Botón de Pantalla Completa */}
            <button
              type="button"
              tabIndex={0}
              onClick={handleToggleFullscreen}
              className="p-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800 transition cursor-pointer"
              title="Pantalla Completa"
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4 text-red-500" />
              ) : (
                <Maximize className="h-4 w-4 text-red-500" />
              )}
            </button>

            {/* Recargar */}
            <button
              type="button"
              tabIndex={0}
              onClick={handleReload}
              className="p-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800 transition cursor-pointer"
              title="Recargar"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-red-500' : ''}`} />
            </button>

            {onClose && (
              <button
                type="button"
                tabIndex={0}
                onClick={onClose}
                className="p-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-900 text-neutral-400 hover:text-red-500 border border-neutral-800 transition cursor-pointer"
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Controles de Temporada y Episodio para Series */}
        {type === 'tv' && (
          <div className="flex items-center justify-between px-4 py-2 bg-neutral-950 border-b border-neutral-900 text-xs z-20">
            <div className="flex items-center gap-4">
              {/* Temporada */}
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-400">Temporada</span>
                <button
                  type="button"
                  tabIndex={0}
                  disabled={currentSeason <= 1}
                  onClick={() => handleSeasonChange(currentSeason - 1)}
                  className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 disabled:opacity-20 text-white transition cursor-pointer"
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
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Episodio */}
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-400">Episodio</span>
                <button
                  type="button"
                  tabIndex={0}
                  disabled={currentEpisode <= 1}
                  onClick={() => handleEpisodeChange(currentEpisode - 1)}
                  className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 disabled:opacity-20 text-white transition cursor-pointer"
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
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <span className="text-neutral-500 font-mono text-[11px]">
              T{currentSeason}:E{currentEpisode}
            </span>
          </div>
        )}

        {/* Viewport del Video Adaptable a 16:9 y 9:16 */}
        <div
          className={`relative w-full bg-black overflow-hidden flex items-center justify-center flex-1 transition-all duration-300 ${
            isFullscreen
              ? 'h-full flex-1'
              : aspectRatio === '9:16'
              ? 'aspect-[9/16] max-w-sm sm:max-w-md mx-auto min-h-[460px] sm:min-h-[580px]'
              : 'aspect-video min-h-[260px] sm:min-h-[400px]'
          }`}
        >
          {/* Contenedor interno */}
          <div
            className={`relative w-full h-full flex items-center justify-center ${
              isFullscreen && aspectRatio === '9:16'
                ? 'aspect-[9/16] max-h-screen mx-auto'
                : 'w-full h-full'
            }`}
          >
            {/* Indicador de Carga */}
            {isLoading && !hasTimedOut && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/85 backdrop-blur-xs text-white space-y-3 pointer-events-none">
                <div className="h-10 w-10 rounded-full border-3 border-red-600 border-t-transparent animate-spin" />
              </div>
            )}

            {/* Aviso de Recarga */}
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

            {/* Capa "Toca para Reproducir" */}
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

            {/* Capa Silenciosa de Absorción de Clickjacking (sin textos visuales) */}
            {!showPlayOverlay && shieldActive && (
              <div
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

            {/* Iframe del Reproductor */}
            <iframe
              key={iframeKey}
              src={streamUrl}
              title={title || 'Reproductor'}
              className="h-full w-full border-0"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture; screen-wake-lock"
              referrerPolicy="origin"
              allowFullScreen
              onLoad={handleIframeLoad}
            />
          </div>
        </div>

      </div>

    </div>
  );
};
