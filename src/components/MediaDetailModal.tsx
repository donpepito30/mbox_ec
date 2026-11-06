// Mbox_ec - Modal de Detalles y Ficha Audiovisual
import React, { useEffect, useState } from 'react';
import { X, Star, Clock, Calendar, Film, Play, Tv, ShieldCheck, Globe } from 'lucide-react';
import { MediaDetails, MediaItem } from '../types/index.ts';
import { getImageUrl, getMediaDetails } from '../services/tmdb.ts';
import { launchInBrave } from '../services/brave.ts';

interface MediaDetailModalProps {
  item: MediaItem | null;
  onClose: () => void;
  onPlay?: (item: MediaItem) => void;
}

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({ item, onClose, onPlay }) => {
  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVideo, setShowVideo] = useState(false);
  const [braveNotice, setBraveNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!item) {
      setDetails(null);
      return;
    }

    let active = true;
    setLoading(true);
    setShowVideo(false);

    const type = item.media_type === 'tv' ? 'tv' : 'movie';
    getMediaDetails(item.id, type)
      .then((data) => {
        if (active) {
          setDetails(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error al obtener ficha:', err);
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [item]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'GoBack') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  const title = details?.title || details?.name || item.title || item.name || 'Título';
  const releaseYear = (details?.release_date || details?.first_air_date || item.release_date || item.first_air_date || '').split('-')[0] || '—';
  const rating = Number(details?.vote_average || item.vote_average || 0).toFixed(1);
  const backdropUrl = getImageUrl(details?.backdrop_path || item.backdrop_path, 'original');
  const posterUrl = getImageUrl(details?.poster_path || item.poster_path, 'w500');
  const isTv = (details?.media_type || item.media_type) === 'tv';

  const trailerVideo = details?.videos?.results?.find(
    (v) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
  );

  const formatRuntime = (mins?: number) => {
    if (!mins) return null;
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl max-h-[92dvh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl my-auto text-neutral-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Botón cerrar flotante */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-black/80 text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors border border-neutral-800 cursor-pointer"
          aria-label="Cerrar ventana"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Cabecera con imagen de fondo panorámica */}
        <div className="relative aspect-[21/9] sm:aspect-[24/9] w-full overflow-hidden bg-black">
          <img
            src={backdropUrl}
            alt={title}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover object-top opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />
          
          <div className="absolute bottom-4 left-6 right-6">
            <div className="flex items-center gap-2 text-xs text-red-500 font-bold uppercase tracking-wider">
              {isTv ? <Tv className="h-4 w-4" /> : <Film className="h-4 w-4" />}
              <span>{isTv ? 'Serie' : 'Película'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white mt-1 drop-shadow-md">
              {title}
            </h2>
          </div>
        </div>

        {/* Contenido principal en dos columnas (Póster + Datos) */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row gap-6">
            
            {/* Columna izquierda: Póster vertical */}
            <div className="w-full sm:w-48 shrink-0">
              <div className="aspect-[2/3] w-full overflow-hidden rounded-xl border border-neutral-800 bg-black shadow-lg">
                <img
                  src={posterUrl}
                  alt={title}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Botones de acción */}
              <div className="mt-3.5 space-y-2">
                {onPlay && (
                  <button
                    onClick={() => {
                      onPlay(item);
                      onClose();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 px-4 text-xs font-bold text-white hover:bg-red-500 transition-colors shadow-lg shadow-red-950/50 cursor-pointer"
                  >
                    <Play className="h-4 w-4 fill-white" />
                    <span>Ver Ahora</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    const isTvItem = (details?.media_type || item.media_type) === 'tv';
                    const targetUrl = isTvItem
                      ? `https://autoembed.cc/embed/tv/${item.id}/1/1`
                      : `https://autoembed.cc/embed/movie/${item.id}`;
                    const res = launchInBrave(targetUrl);
                    setBraveNotice(res.message);
                    setTimeout(() => setBraveNotice(null), 4500);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-orange-500/40 bg-orange-950/20 py-2.5 px-3 text-xs font-bold text-orange-400 hover:bg-orange-950/40 hover:border-orange-500 transition-colors cursor-pointer shadow-md"
                  title="Abrir transmisión directamente en Brave Browser sin anuncios ni popups"
                >
                  <ShieldCheck className="h-4 w-4 text-orange-400" />
                  <span>Ver en Brave (Sin Anuncios)</span>
                </button>

                {trailerVideo && (
                  <button
                    onClick={() => setShowVideo(!showVideo)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 px-3 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 text-red-500" />
                    <span>{showVideo ? 'Ocultar Tráiler' : 'Ver Tráiler'}</span>
                  </button>
                )}

                {braveNotice && (
                  <div className="rounded-lg bg-orange-950/90 border border-orange-500/50 p-2.5 text-[11px] text-orange-200 leading-tight animate-in fade-in">
                    {braveNotice}
                  </div>
                )}
              </div>
            </div>

            {/* Columna derecha: Metadatos y sinopsis */}
            <div className="flex-1 space-y-4">
              
              {/* Metadatos */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm text-neutral-400">
                <span className="flex items-center gap-1 font-bold text-amber-400 font-mono tabular-nums">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {rating}
                </span>
                <span aria-hidden="true" className="text-neutral-700">·</span>
                <span className="flex items-center gap-1 rounded bg-neutral-900 border border-neutral-800 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                  <Globe className="h-3 w-3 text-emerald-400" />
                  <span>Multi-audio y subtítulos</span>
                </span>
                <span aria-hidden="true" className="text-neutral-700">·</span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                  <span>{releaseYear}</span>
                </span>
                {details?.runtime && (
                  <>
                    <span aria-hidden="true" className="text-neutral-700">·</span>
                    <span className="flex items-center gap-1 font-mono tabular-nums">
                      <Clock className="h-3.5 w-3.5 text-neutral-500" />
                      <span>{formatRuntime(details.runtime)}</span>
                    </span>
                  </>
                )}
                {details?.number_of_seasons && (
                  <>
                    <span aria-hidden="true" className="text-neutral-700">·</span>
                    <span className="font-mono tabular-nums">
                      {details.number_of_seasons} Temporada{details.number_of_seasons > 1 ? 's' : ''} ({details.number_of_episodes} episodios)
                    </span>
                  </>
                )}
                {details?.status && (
                  <>
                    <span aria-hidden="true" className="text-neutral-700">·</span>
                    <span className="text-neutral-300">{details.status}</span>
                  </>
                )}
              </div>

              {/* Tagline */}
              {details?.tagline && (
                <p className="text-sm italic text-neutral-400 border-l-2 border-red-600 pl-3">
                  "{details.tagline}"
                </p>
              )}

              {/* Sinopsis */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Sinopsis
                </h4>
                <p className="text-sm text-neutral-200 leading-relaxed">
                  {details?.overview || item.overview || 'Sinopsis no disponible en este momento.'}
                </p>
              </div>

              {/* Géneros */}
              {details?.genres && details.genres.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Géneros
                  </h4>
                  <div className="flex flex-wrap gap-2 text-xs text-neutral-300">
                    {details.genres.map((g, idx) => (
                      <span key={g.id} className="rounded-md bg-neutral-900 border border-neutral-800 px-2.5 py-1">
                        {g.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* Reproductor de Video Embebido si el usuario activó "Ver Tráiler" */}
          {showVideo && trailerVideo && (
            <div className="aspect-video w-full overflow-hidden rounded-xl border border-neutral-800 bg-black shadow-2xl">
              <iframe
                title={trailerVideo.name}
                src={`https://www.youtube-nocookie.com/embed/${trailerVideo.key}?autoplay=1`}
                className="h-full w-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {/* Reparto destacado */}
          {details?.credits?.cast && details.credits.cast.length > 0 && (
            <div className="pt-4 border-t border-neutral-800">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
                Reparto Principal
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {details.credits.cast.slice(0, 4).map((actor) => (
                  <div key={actor.id} className="rounded-xl bg-neutral-900/80 p-3 border border-neutral-800">
                    <div className="font-semibold text-white truncate">{actor.name}</div>
                    <div className="text-neutral-400 truncate text-[11px] mt-0.5">{actor.character}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
