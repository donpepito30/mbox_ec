// Mbox_ec - Plataforma de Streaming de Películas y Series
// Estilo Minimalista Netflix / Pluto TV en Negro, Rojo y Blanco
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Star,
  Play,
  Film,
  Tv,
  Flame,
  Search,
  ArrowLeft,
  Info,
  RefreshCw,
} from 'lucide-react';
import { MediaItem, MediaType, MediaDetails } from './types/index.ts';
import { getTrending, getMediaDetails, searchMedia, getImageUrl } from './services/tmdb.ts';
import { Player } from './components/Player.tsx';
import { MediaDetailModal } from './components/MediaDetailModal.tsx';
import { PWAInstallButton } from './components/PWAInstallButton.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';

export default function App() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [selectedMediaType, setSelectedMediaType] = useState<MediaType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Estado de reproducción /watch/[id]
  const [watchingItem, setWatchingItem] = useState<MediaItem | null>(null);
  const [watchingDetails, setWatchingDetails] = useState<MediaDetails | null>(null);

  // Modal de ficha y trailer
  const [selectedDetailItem, setSelectedDetailItem] = useState<MediaItem | null>(null);

  // Cargar detalles y trailer al reproducir
  useEffect(() => {
    if (!watchingItem) {
      setWatchingDetails(null);
      return;
    }
    let isMounted = true;
    const type = watchingItem.media_type === 'tv' ? 'tv' : 'movie';
    getMediaDetails(watchingItem.id, type, 'videos')
      .then((data: MediaDetails) => {
        if (isMounted) setWatchingDetails(data);
      })
      .catch((err: unknown) => console.warn('Error al cargar detalles:', err));

    return () => {
      isMounted = false;
    };
  }, [watchingItem]);

  // Cargar contenidos en tendencia desde TMDb
  const loadContent = useCallback(async (type: MediaType, query: string) => {
    setIsLoading(true);
    try {
      if (query.trim()) {
        const searchRes = await searchMedia(query, type);
        setItems(searchRes.results || []);
      } else {
        const res = await getTrending(type, 'week');
        setItems(res.results || []);
      }
    } catch (err) {
      console.error('Error al cargar catálogo:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Efecto de búsqueda con debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      loadContent(selectedMediaType, '');
      return;
    }

    const timer = setTimeout(() => {
      loadContent(selectedMediaType, searchQuery);
    }, 350);

    return () => clearTimeout(timer);
  }, [selectedMediaType, searchQuery, loadContent]);

  // Neutralizador Global de Pop-ups (Anti-Clickjacking / Ad Interceptor)
  useEffect(() => {
    const originalOpen = window.open;
    window.open = function (url?: string | URL, target?: string, features?: string) {
      console.warn('[Mbox_ec Shield] Ventana emergente no deseada bloqueada:', url);
      return null;
    };
    return () => {
      window.open = originalOpen;
    };
  }, []);

  // Navegación con Control Remoto (D-pad & Teclado Android TV)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if (e.key === 'Escape' || e.key === 'Backspace' || e.key === 'GoBack') {
        if (selectedDetailItem) {
          setSelectedDetailItem(null);
        } else if (watchingItem) {
          setWatchingItem(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDetailItem, watchingItem]);

  // Contenido destacado para el Hero Banner
  const featuredItem = useMemo(() => {
    if (items.length === 0) return null;
    return items[0];
  }, [items]);

  // Catálogo restante
  const catalogItems = useMemo(() => {
    if (searchQuery.trim()) return items;
    return items.slice(1);
  }, [items, searchQuery]);

  // Iniciar reproducción
  const handleWatch = (item: MediaItem) => {
    setWatchingItem(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToCatalog = () => {
    setWatchingItem(null);
  };

  const featuredTitle = featuredItem?.title || featuredItem?.name || 'Producción Destacada';
  const featuredYear = (featuredItem?.release_date || featuredItem?.first_air_date || '').split('-')[0] || '2024';
  const featuredRating = Number(featuredItem?.vote_average || 0).toFixed(1);
  const featuredBackdrop = getImageUrl(featuredItem?.backdrop_path || featuredItem?.poster_path, 'original');

  return (
    <div 
      className="min-h-[100dvh] bg-black text-neutral-100 flex flex-col font-sans selection:bg-red-600 selection:text-white"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      
      {/* 1. Header Minimalista Estilo Netflix / Pluto TV */}
      <header className="sticky top-0 z-50 w-full border-b border-neutral-900 bg-black/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          
          {/* Logo Mbox_ec */}
          <div 
            onClick={() => {
              setWatchingItem(null);
              setSelectedMediaType('all');
              setSearchQuery('');
            }}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <span className="text-2xl sm:text-3xl font-black tracking-tighter text-white uppercase select-none">
              MBOX<span className="text-red-600">_EC</span>
            </span>
          </div>

          {/* Navegación y Acciones */}
          <nav className="flex items-center gap-3 sm:gap-6 text-sm font-medium">
            <button
              onClick={() => {
                setWatchingItem(null);
                setSelectedMediaType('all');
              }}
              className={`transition cursor-pointer text-xs sm:text-sm ${
                !watchingItem && selectedMediaType === 'all'
                  ? 'text-white font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Inicio
            </button>

            <button
              onClick={() => {
                setWatchingItem(null);
                setSelectedMediaType('movie');
              }}
              className={`transition cursor-pointer text-xs sm:text-sm ${
                !watchingItem && selectedMediaType === 'movie'
                  ? 'text-white font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Películas
            </button>

            <button
              onClick={() => {
                setWatchingItem(null);
                setSelectedMediaType('tv');
              }}
              className={`transition cursor-pointer text-xs sm:text-sm ${
                !watchingItem && selectedMediaType === 'tv'
                  ? 'text-white font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Series
            </button>

            {/* Botón PWA Install */}
            <PWAInstallButton />
          </nav>

        </div>
      </header>

      {/* 2. Contenido Principal */}
      <main className="flex-1 pb-16">
        
        {/* Vista A: Vista de Reproducción /watch/[id] */}
        {watchingItem ? (
          <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6 animate-in fade-in duration-200">
            {/* Barra de Retorno */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-900">
              <button
                onClick={handleBackToCatalog}
                className="flex items-center gap-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 px-4 py-2 text-xs font-bold text-neutral-200 transition cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 text-red-500" />
                <span>Volver al Catálogo</span>
              </button>
            </div>

            {/* Reproductor Multi-Fuente (Smashy & VidSrc) */}
            <Player
              tmdbId={watchingItem.id}
              imdbId={watchingDetails?.imdb_id || watchingItem.imdb_id}
              type={watchingItem.media_type === 'tv' ? 'tv' : 'movie'}
              season={1}
              episode={1}
              title={watchingItem.title || watchingItem.name}
              backdropUrl={getImageUrl(watchingItem.backdrop_path || watchingItem.poster_path, 'original')}
              onClose={handleBackToCatalog}
            />

            {/* Grid Visual: Detalles del Título y Tráiler Oficial */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Información y Sinopsis */}
              <div className="lg:col-span-2 rounded-2xl border border-neutral-900 bg-neutral-950/80 p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-900">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-white">
                      {watchingDetails?.title || watchingDetails?.name || watchingItem.title || watchingItem.name}
                    </h1>
                    <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1">
                      <span className="capitalize">{watchingItem.media_type === 'tv' ? 'Serie' : 'Película'}</span>
                      <span aria-hidden="true">·</span>
                      <span>{(watchingDetails?.release_date || watchingDetails?.first_air_date || watchingItem.release_date || watchingItem.first_air_date || '').split('-')[0] || '2024'}</span>
                      {watchingDetails?.runtime && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{Math.floor(watchingDetails.runtime / 60)}h {watchingDetails.runtime % 60}m</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-lg bg-black border border-neutral-800 px-3 py-1.5 text-xs font-bold text-amber-400 font-mono tabular-nums">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span>{Number(watchingDetails?.vote_average || watchingItem.vote_average || 0).toFixed(1)}</span>
                    </div>

                    <button
                      onClick={() => setSelectedDetailItem(watchingItem)}
                      className="flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-neutral-300 hover:text-white transition cursor-pointer"
                    >
                      <Info className="h-3.5 w-3.5 text-red-500" />
                      <span>Detalles</span>
                    </button>
                  </div>
                </div>

                {watchingDetails?.tagline && (
                  <p className="text-xs text-neutral-400 italic">
                    "{watchingDetails.tagline}"
                  </p>
                )}

                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                    Sinopsis
                  </h3>
                  <p className="text-sm text-neutral-200 leading-relaxed">
                    {watchingDetails?.overview || watchingItem.overview || 'Sinopsis no disponible en este momento.'}
                  </p>
                </div>

                {watchingDetails?.genres && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {watchingDetails.genres.map((g: any) => (
                      <span key={g.id} className="rounded-md bg-neutral-900 border border-neutral-800 px-2.5 py-1 text-xs text-neutral-300">
                        {g.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Tráiler Oficial de YouTube */}
              <div className="rounded-2xl border border-neutral-900 bg-neutral-950/80 p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-900">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wide">
                    <Play className="h-3.5 w-3.5 text-red-600 fill-red-600" />
                    <span>Tráiler Oficial</span>
                  </div>
                </div>

                {(() => {
                  const trailer = watchingDetails?.videos?.results?.find(
                    (v: any) => v.site === 'YouTube' && v.type === 'Trailer'
                  ) || watchingDetails?.videos?.results?.find((v: any) => v.site === 'YouTube');

                  if (!trailer) {
                    return (
                      <div className="aspect-video w-full flex items-center justify-center rounded-xl bg-black text-xs text-neutral-500 border border-neutral-900">
                        Cargando avance...
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-neutral-800 shadow-lg">
                        <iframe
                          src={`https://www.youtube-nocookie.com/embed/${trailer.key}?rel=0`}
                          title={trailer.name}
                          allowFullScreen
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          className="h-full w-full border-0"
                        />
                      </div>
                      <div className="text-[11px] text-neutral-400 truncate">
                        {trailer.name}
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>
          </section>
        ) : (
          /* Vista B: Catálogo Principal Estilo Netflix / Pluto TV */
          <div>
            
            {/* Hero Banner Destacado */}
            {!searchQuery.trim() && featuredItem && (
              <section className="relative w-full overflow-hidden border-b border-neutral-900 bg-black">
                {/* Backdrop oficial con degradado cinemático a negro */}
                <div className="absolute inset-0 z-0">
                  <img
                    src={featuredBackdrop}
                    alt={featuredTitle}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1280&auto=format&fit=crop&q=80';
                    }}
                    className="h-full w-full object-cover object-top opacity-45"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-transparent" />
                </div>

                <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
                  <div className="max-w-2xl space-y-4">
                    
                    {/* Metadatos superiores */}
                    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                      <span className="text-red-500 font-bold">
                        Tendencia
                      </span>
                      <span aria-hidden="true" className="text-neutral-700">·</span>
                      <span className="capitalize text-neutral-300">
                        {featuredItem.media_type === 'tv' ? 'Serie' : 'Película'}
                      </span>
                      <span aria-hidden="true" className="text-neutral-700">·</span>
                      <span className="font-mono text-neutral-300">{featuredYear}</span>
                    </div>

                    {/* Título Principal */}
                    <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl text-balance leading-none drop-shadow-md">
                      {featuredTitle}
                    </h1>

                    {/* Calificación */}
                    <div className="flex items-center gap-3 text-sm text-neutral-300">
                      <span className="flex items-center gap-1 font-bold text-amber-400 font-mono tabular-nums">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        {featuredRating}
                      </span>
                      {featuredItem.vote_count && (
                        <>
                          <span aria-hidden="true" className="text-neutral-700">|</span>
                          <span className="text-xs text-neutral-400 font-mono tabular-nums">
                            {featuredItem.vote_count.toLocaleString()} votos
                          </span>
                        </>
                      )}
                    </div>

                    {/* Sinopsis */}
                    <p className="line-clamp-3 text-sm sm:text-base leading-relaxed text-neutral-300 max-w-xl">
                      {featuredItem.overview || 'Sinopsis completa disponible en la plataforma.'}
                    </p>

                    {/* Botones de acción */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        onClick={() => handleWatch(featuredItem)}
                        className="inline-flex items-center gap-2.5 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-xl shadow-red-950/70 hover:bg-red-500 transition-all cursor-pointer group"
                      >
                        <Play className="h-4 w-4 fill-white group-hover:scale-110 transition-transform" />
                        <span>Ver Ahora</span>
                      </button>

                      <button
                        onClick={() => setSelectedDetailItem(featuredItem)}
                        className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/90 px-5 py-3 text-sm font-semibold text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
                      >
                        <Info className="h-4 w-4 text-neutral-400" />
                        <span>Más Información</span>
                      </button>
                    </div>

                  </div>
                </div>
              </section>
            )}

            {/* Contenedor del Catálogo */}
            <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 space-y-6">
              
              {/* Barra de Filtros y Buscador */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-neutral-900">
                
                {/* Categorías */}
                <div className="flex items-center gap-1 p-1 bg-neutral-950 border border-neutral-900 rounded-xl text-xs self-start">
                  <button
                    onClick={() => setSelectedMediaType('all')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      selectedMediaType === 'all'
                        ? 'bg-red-600 text-white shadow-md shadow-red-950'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Flame className="h-3.5 w-3.5" />
                    <span>Todos</span>
                  </button>

                  <button
                    onClick={() => setSelectedMediaType('movie')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      selectedMediaType === 'movie'
                        ? 'bg-red-600 text-white shadow-md shadow-red-950'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Film className="h-3.5 w-3.5" />
                    <span>Películas</span>
                  </button>

                  <button
                    onClick={() => setSelectedMediaType('tv')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      selectedMediaType === 'tv'
                        ? 'bg-red-600 text-white shadow-md shadow-red-950'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Tv className="h-3.5 w-3.5" />
                    <span>Series</span>
                  </button>
                </div>

                {/* Buscador Rápido */}
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar películas o series..."
                    className="w-full rounded-xl border border-neutral-800 bg-neutral-950 pl-9 pr-8 py-2 text-xs text-white placeholder-neutral-500 focus:border-red-600 focus:outline-none transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2 text-sm text-neutral-400 hover:text-white cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>

              </div>

              {/* Título de Sección */}
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    {searchQuery.trim()
                      ? `Resultados para "${searchQuery}"`
                      : 'Estrenos y Series Populares'}
                  </h2>
                </div>

                <button
                  onClick={() => loadContent(selectedMediaType, searchQuery)}
                  disabled={isLoading}
                  className="hidden sm:flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-300 hover:text-white transition cursor-pointer"
                >
                  <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin text-red-500' : ''}`} />
                  <span>Actualizar</span>
                </button>
              </div>

              {/* Catálogo en Grid Estilo Netflix / Pluto TV (2 cols mobile a 5 cols desktop) */}
              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4 md:gap-5">
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="aspect-[2/3] animate-pulse rounded-xl bg-neutral-950 border border-neutral-900"
                    />
                  ))}
                </div>
              ) : catalogItems.length === 0 ? (
                <div className="py-20 text-center text-neutral-500">
                  <Film className="h-12 w-12 mx-auto mb-3 opacity-30 text-neutral-400" />
                  <p className="text-sm font-semibold text-neutral-300">No se encontraron títulos disponibles</p>
                  <p className="text-xs text-neutral-500 mt-1">Prueba con otra búsqueda o filtro</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4 md:gap-5">
                  {catalogItems.map((item) => {
                    const title = item.title || item.name || 'Título';
                    const year = (item.release_date || item.first_air_date || '').split('-')[0] || '—';
                    const rating = Number(item.vote_average || 0).toFixed(1);
                    const isTv = item.media_type === 'tv' || (!item.title && Boolean(item.name));
                    const posterUrl = getImageUrl(item.poster_path, 'w500');

                    return (
                      <article
                        key={item.id}
                        tabIndex={0}
                        onClick={() => handleWatch(item)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleWatch(item);
                          }
                        }}
                        className="group relative flex flex-col overflow-hidden rounded-xl border border-neutral-900 bg-neutral-950 transition-all duration-300 hover:-translate-y-1.5 hover:border-neutral-700 hover:shadow-2xl hover:shadow-black cursor-pointer focus:outline-none focus:ring-4 focus:ring-red-600 focus:scale-[1.03]"
                      >
                        {/* Póster de TMDb en Aspecto 2:3 */}
                        <div className="relative aspect-[2/3] w-full overflow-hidden bg-black">
                          <img
                            src={posterUrl}
                            alt={`Póster de ${title}`}
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=80';
                            }}
                            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                          />

                          {/* Gradiente en la base del póster */}
                          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black via-black/60 to-transparent" />

                          {/* Calificación */}
                          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded bg-black/85 px-2 py-0.5 text-xs font-bold text-amber-400 font-mono tabular-nums backdrop-blur-md border border-neutral-800 shadow">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span>{rating}</span>
                          </div>

                          {/* Botón flotante de reproducción en hover estilo Netflix */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[1px]">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white shadow-xl shadow-red-950 scale-90 group-hover:scale-100 transition-transform">
                              <Play className="h-5 w-5 fill-white ml-0.5" />
                            </div>
                          </div>
                        </div>

                        {/* Metadatos y Título */}
                        <div className="flex flex-1 flex-col justify-between p-3 space-y-1">
                          <h3 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-red-500 transition-colors">
                            {title}
                          </h3>

                          <div className="flex items-center justify-between text-[11px] text-neutral-400">
                            <span className="flex items-center gap-1 text-neutral-400">
                              {isTv ? <Tv className="h-3 w-3 text-neutral-500" /> : <Film className="h-3 w-3 text-neutral-500" />}
                              <span>{isTv ? 'Serie' : 'Película'}</span>
                            </span>
                            <span className="font-mono tabular-nums text-neutral-400">{year}</span>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

            </div>
          </div>
        )}

      </main>

      {/* Modal de Ficha Técnica */}
      {selectedDetailItem && (
        <MediaDetailModal
          item={selectedDetailItem}
          onClose={() => setSelectedDetailItem(null)}
          onPlay={handleWatch}
        />
      )}

      {/* Footer Minimalista Mbox_ec */}
      <footer className="border-t border-neutral-900 bg-black py-8 text-neutral-500 text-xs text-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-white tracking-wider">
              MBOX<span className="text-red-600">_EC</span>
            </span>
            <span className="text-neutral-600">·</span>
            <span>Películas y Series en Streaming</span>
          </div>
          <p>© {new Date().getFullYear()} Mbox_ec · Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* Indicador de conectividad Offline */}
      <OfflineIndicator />

    </div>
  );
}
