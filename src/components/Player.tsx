// Mbox_ec - Reproductor SmashyStream Optimizado
// Soporte de Pantalla Completa Nativa, Formato 16:9 / 9:16 y Prioridad de Audio en Español (Latino / Castellano)
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
  Volume2,
  Headphones,
  SlidersHorizontal,
} from 'lucide-react';

export interface PlayerProps {
  /** Identificador de TMDb */
  tmdbId: number | string;
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
  type,
  season = 1,
  episode = 1,
  title,
  backdropUrl,
  onClose,
}) => {
  const [currentSeason, setCurrentSeason] = useState<number>(season);
  const [currentEpisode, setCurrentEpisode] = useState<number>(episode);

  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showPlayOverlay, setShowPlayOverlay] = useState<boolean>(true);
  const [hasTimedOut, setHasTimedOut] = useState<boolean>(false);

  // Selector de aspecto: 16:9 (horizontal estándar) o 9:16 (vertical para móvil/pantalla completa)
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Configuración de Audio en Español
  const [audioPreference, setAudioPreference] = useState<'latino' | 'castellano'>('latino');
  const [serverEngine, setServerEngine] = useState<'smashy1' | 'smashy2'>('smashy1');
  const [showAudioHelp, setShowAudioHelp] = useState<boolean>(false);

  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Genera la URL optimizada para SmashyStream con parámetros prioritarios en Español
   */
  const getSmashyUrl = useCallback((): string => {
    const s = currentSeason || 1;
    const e = currentEpisode || 1;
    const langCode = audioPreference === 'castellano' ? 'es-ES' : 'es-MX';

    if (serverEngine === 'smashy2') {
      return type === 'tv'
        ? `https://player.smashy.stream/tv/${tmdbId}?s=${s}&e=${e}&lang=${langCode}&audio=es`
        : `https://player.smashy.stream/movie/${tmdbId}?lang=${langCode}&audio=es`;
    }

    // Servidor Smashy 1 (playere.php optimizado con parámetros en español)
    return type === 'tv'
      ? `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}&season=${s}&episode=${e}&lang=${langCode}&audio=es&sub=es`
      : `https://embed.smashystream.com/playere.php?tmdb=${tmdbId}&lang=${langCode}&audio=es&sub=es`;
  }, [type, tmdbId, currentSeason, currentEpisode, audioPreference, serverEngine]);

  const streamUrl = getSmashyUrl();

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
    setIframeKey((prev) => prev + 1);
    startTimer();
  }, [tmdbId, type, season, episode, audioPreference, serverEngine, startTimer]);

  // Detección de cambios de estado en Fullscreen nativo
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

  // Función de Pantalla Completa Nativa dentro de la web
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
      console.warn('Error alternando pantalla completa:', err);
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
      setIframeKey((prev) => prev + 1);
      startTimer();
    }
  };

  const handleEpisodeChange = (newEpisode: number) => {
    if (newEpisode >= 1 && newEpisode !== currentEpisode) {
      setCurrentEpisode(newEpisode);
      setShowPlayOverlay(true);
      setIframeKey((prev) => prev + 1);
      startTimer();
    }
  };

  const handleReload = () => {
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

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return (
    <div className="w-full space-y-3 select-none">
      
      {/* Contenedor del Reproductor Estilo Netflix */}
      <div
        ref={playerContainerRef}
        className={`relative overflow-hidden rounded-2xl border border-neutral-900 bg-black shadow-2xl flex flex-col transition-all duration-300 ${
          isFullscreen ? 'h-screen w-screen rounded-none border-0 p-0 m-0 bg-black flex flex-col justify-between' : ''
        }`}
      >
        
        {/* Barra Superior */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-gradient-to-b from-neutral-900/95 to-black/90 border-b border-neutral-800/80 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse shrink-0" />
            <h2 className="text-sm sm:text-base font-black text-white truncate tracking-tight">
              {title || (type === 'tv' ? 'Serie en Reproducción' : 'Película en Reproducción')}
            </h2>
            
            {/* Badge de Audio en Español */}
            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-950/80 border border-red-800/80 text-[11px] font-bold text-red-300">
              <Headphones className="h-3 w-3 text-red-400" />
              <span>Audio en Español</span>
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Selector de Pista de Audio: Latino vs Castellano */}
            <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setAudioPreference('latino')}
                className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                  audioPreference === 'latino'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Priorizar pista de audio Español Latino"
              >
                Latino
              </button>
              <button
                type="button"
                onClick={() => setAudioPreference('castellano')}
                className={`px-2 py-1 rounded text-[11px] font-bold transition cursor-pointer ${
                  audioPreference === 'castellano'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Priorizar pista de audio Español Castellano"
              >
                Castellano
              </button>
            </div>

            {/* Selector de Motor Smashy */}
            <button
              type="button"
              onClick={() => setServerEngine(serverEngine === 'smashy1' ? 'smashy2' : 'smashy1')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 text-xs font-semibold transition cursor-pointer"
              title="Cambiar entre servidor Smashy 1 y Smashy 2 si la película no tiene audio en español en el servidor actual"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-red-500" />
              <span className="text-[11px] font-mono">{serverEngine === 'smashy1' ? 'Servidor 1' : 'Servidor 2'}</span>
            </button>

            {/* Selector de Formato 16:9 / 9:16 */}
            <button
              type="button"
              onClick={handleToggleAspectRatio}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 text-xs font-semibold transition cursor-pointer"
              title={`Alternar formato (${aspectRatio}). Pulsa para 16:9 u 9:16.`}
            >
              {aspectRatio === '16:9' ? (
                <>
                  <Tv className="h-3.5 w-3.5 text-red-500" />
                  <span className="font-mono text-[11px] font-bold">16:9</span>
                </>
              ) : (
                <>
                  <Smartphone className="h-3.5 w-3.5 text-red-500" />
                  <span className="font-mono text-[11px] font-bold">9:16</span>
                </>
              )}
            </button>

            {/* Botón de Pantalla Completa Nativa */}
            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 hover:border-neutral-700 text-xs font-semibold transition cursor-pointer"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa nativa'}
            >
              {isFullscreen ? (
                <>
                  <Minimize className="h-3.5 w-3.5 text-red-500" />
                  <span className="hidden sm:inline">Salir</span>
                </>
              ) : (
                <>
                  <Maximize className="h-3.5 w-3.5 text-red-500" />
                  <span className="hidden sm:inline">Pantalla Completa</span>
                </>
              )}
            </button>

            {/* Recargar */}
            <button
              type="button"
              onClick={handleReload}
              className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition cursor-pointer"
              title="Recargar reproductor"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-red-500' : ''}`} />
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-red-500 border border-neutral-800 transition cursor-pointer"
                title="Cerrar reproductor"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Barra Informativa de Audio en Español */}
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-gradient-to-r from-red-950/40 via-neutral-950 to-neutral-950 border-b border-neutral-900 text-xs text-neutral-300">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-red-500 shrink-0" />
            <span className="font-medium text-neutral-200">
              Idioma configurado: <strong className="text-white">Español {audioPreference === 'latino' ? 'Latino' : 'Castellano'}</strong>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowAudioHelp(!showAudioHelp)}
            className="text-[11px] text-red-400 hover:text-red-300 underline font-medium cursor-pointer"
          >
            {showAudioHelp ? 'Ocultar ayuda' : '¿Cómo cambiar audio en pantalla?'}
          </button>
        </div>

        {/* Guía Rápida de Pista de Audio */}
        {showAudioHelp && (
          <div className="px-4 py-2.5 bg-neutral-900/90 border-b border-neutral-800 text-xs text-neutral-300 animate-in fade-in">
            <p className="leading-relaxed">
              💡 <strong>Activar audio en español:</strong> Dentro del reproductor de video, en la barra inferior derecha, haz clic en el icono de <strong>Engranaje (⚙️)</strong> o en el icono de <strong>Audio / Subtítulos (💬)</strong> y selecciona la pista <em>"Español Latino"</em> o <em>"Castellano"</em>. Si un servidor no tiene la pista en español para este título, pulsa el botón <strong>"Servidor 2"</strong> en la barra superior.
            </p>
          </div>
        )}

        {/* Controles de Temporada y Episodio para Series */}
        {type === 'tv' && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-neutral-950 border-b border-neutral-900 text-xs z-20">
            <div className="flex items-center gap-4">
              {/* Temporada */}
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-400 font-medium">Temporada:</span>
                <button
                  type="button"
                  disabled={currentSeason <= 1}
                  onClick={() => handleSeasonChange(currentSeason - 1)}
                  className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 disabled:opacity-20 text-white transition cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="font-bold text-red-500 px-1.5 tabular-nums text-sm">
                  {currentSeason}
                </span>
                <button
                  type="button"
                  onClick={() => handleSeasonChange(currentSeason + 1)}
                  className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 text-white transition cursor-pointer"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Episodio */}
              <div className="flex items-center gap-1.5">
                <span className="text-neutral-400 font-medium">Episodio:</span>
                <button
                  type="button"
                  disabled={currentEpisode <= 1}
                  onClick={() => handleEpisodeChange(currentEpisode - 1)}
                  className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 disabled:opacity-20 text-white transition cursor-pointer"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="font-bold text-red-500 px-1.5 tabular-nums text-sm">
                  {currentEpisode}
                </span>
                <button
                  type="button"
                  onClick={() => handleEpisodeChange(currentEpisode + 1)}
                  className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 text-white transition cursor-pointer"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <span className="text-neutral-400 font-semibold tracking-wide uppercase text-[11px]">
              T{currentSeason} : E{currentEpisode}
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
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xs text-white space-y-3 pointer-events-none">
                <div className="h-10 w-10 rounded-full border-3 border-red-600 border-t-transparent animate-spin" />
                <div className="text-xs font-bold tracking-wider text-neutral-300 uppercase">
                  Cargando reproductor en español...
                </div>
              </div>
            )}

            {/* Aviso de Recarga */}
            {hasTimedOut && (
              <div className="absolute top-3 right-3 z-30 flex items-center gap-2 p-2 rounded-xl bg-neutral-950/90 border border-neutral-800 text-xs text-neutral-300 shadow-xl backdrop-blur-sm">
                <span>¿Tarda en cargar?</span>
                <button
                  type="button"
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
                onClick={handlePlayClick}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/75 backdrop-blur-[2px] p-6 text-center cursor-pointer transition-all duration-300 hover:bg-black/60 group"
                style={
                  backdropUrl
                    ? {
                        backgroundImage: `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.85)), url(${backdropUrl})`,
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

                  <div className="space-y-1">
                    <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                      {title || 'Reproducir Ahora'}
                    </h3>
                    <p className="text-xs text-neutral-300">
                      Audio en Español {audioPreference === 'latino' ? 'Latino' : 'Castellano'} · Pulsa para iniciar
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Iframe SmashyStream con Parámetros en Español */}
            <iframe
              key={iframeKey}
              src={streamUrl}
              title={title || 'Reproductor de Video'}
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
