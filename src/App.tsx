// Mbox_Ec - Plataforma de Streaming en Español (Películas, Series y En Vivo)
// Identidad Oficial: Isotipo Cinema Box 3D, Rojo Neón #FF1A24, Negro Carbón #08080A
// Acceso Protegido Cero-Confianza con Control Total de Usuarios y Panel de Administración
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
  Bookmark,
  BookmarkCheck,
  LogOut,
  ShieldCheck,
  Shield,
  Crown,
  Radio,
} from 'lucide-react';
import { MediaItem, MediaType, MediaDetails } from './types/index.ts';
import { getTrending, getMediaDetails, searchMedia, getImageUrl } from './services/tmdb.ts';
import { Player } from './components/Player.tsx';
import { HeroBanner } from './components/HeroBanner.tsx';
import { GoogleAuthGate } from './components/GoogleAuthGate.tsx';
import { AdminUsersModal } from './components/AdminUsersModal.tsx';
import { CinemaBoxLogo } from './components/CinemaBoxLogo.tsx';
import { MediaDetailModal } from './components/MediaDetailModal.tsx';
import { PWAInstallButton } from './components/PWAInstallButton.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import {
  getCurrentUser,
  logoutUser,
  isInWatchlist,
  toggleWatchlist,
  validateActiveSessionIntegrity,
  isAdmin,
  User,
} from './services/auth.ts';

export default function App() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [selectedMediaType, setSelectedMediaType] = useState<MediaType | 'watchlist' | 'live'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Estado de Autenticación Exclusiva de Google
  const [currentUser, setCurrentUser] = useState<User | null>(() => getCurrentUser());
  const [watchlistVersion, setWatchlistVersion] = useState<number>(0);

  // Modal del Panel de Administración y Control Total
  const [isAdminModalOpen, setIsAdminModalOpen] = useState<boolean>(false);

  // Estado de reproducción /watch/[id]
  const [watchingItem, setWatchingItem] = useState<MediaItem | null>(null);
  const [watchingDetails, setWatchingDetails] = useState<MediaDetails | null>(null);

  // Modal de ficha técnica y trailer
  const [selectedDetailItem, setSelectedDetailItem] = useState<MediaItem | null>(null);

  // Sincronizar usuario activo
  const refreshUserSession = useCallback(() => {
    setCurrentUser(getCurrentUser());
    setWatchlistVersion((prev) => prev + 1);
  }, []);

  // MEDIDA DE SEGURIDAD: Verificación periódica de integridad criptográfica y estado de permanencia
  useEffect(() => {
    if (currentUser) {
      validateActiveSessionIntegrity().then((isValid) => {
        if (!isValid) {
          console.warn('[Mbox_Ec Security] Sesión inválida o revocada por el Administrador.');
          refreshUserSession();
        }
      });
    }
  }, [currentUser, refreshUserSession]);

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

  // Cargar contenidos en tendencia desde TMDb (SOLO para usuarios autenticados y activos)
  const loadContent = useCallback(async (type: MediaType, query: string) => {
    const user = getCurrentUser();
    if (!user || user.status !== 'ACTIVE') return;

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
    if (!currentUser || currentUser.status !== 'ACTIVE') return;
    if (selectedMediaType === 'watchlist' || selectedMediaType === 'live') return;

    if (!searchQuery.trim()) {
      loadContent(selectedMediaType as MediaType, '');
      return;
    }

    const timer = setTimeout(() => {
      loadContent(selectedMediaType as MediaType, searchQuery);
    }, 350);

    return () => clearTimeout(timer);
  }, [currentUser, selectedMediaType, searchQuery, loadContent]);

  // Neutralizador Global de Pop-ups (Anti-Clickjacking / Ad Interceptor)
  useEffect(() => {
    const originalOpen = window.open;
    window.open = function (url?: string | URL) {
      console.warn('[Mbox_Ec Shield] Ventana emergente no autorizada interceptada:', url);
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
        if (isAdminModalOpen) {
          setIsAdminModalOpen(false);
        } else if (selectedDetailItem) {
          setSelectedDetailItem(null);
        } else if (watchingItem) {
          setWatchingItem(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDetailItem, watchingItem, isAdminModalOpen]);

  // Iniciar reproducción
  const handleWatch = (item: MediaItem) => {
    setWatchingItem(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToCatalog = () => {
    setWatchingItem(null);
  };

  // Manejo de Favoritos / Mi Lista
  const handleToggleWatchlist = (item: MediaItem) => {
    toggleWatchlist(item);
    refreshUserSession();
  };

  // Cierre de Sesión Seguro con Purga Criptográfica
  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setItems([]);
    setWatchingItem(null);
    setSelectedDetailItem(null);
    setSelectedMediaType('all');
  };

  // Canales en vivo curados en español
  const liveChannels: MediaItem[] = useMemo(() => [
    {
      id: 99001,
      title: 'Cine de Acción Mbox_Ec (24/7)',
      overview: 'Canal de transmisión continua con las mejores producciones de acción y ciencia ficción en español.',
      poster_path: '/v2NN1TMK3ifuiEyawa3ukkcSOUQ.jpg',
      backdrop_path: '/eZ239CUp1d6OryZEBPnO2n87gMG.jpg',
      release_date: '2026-01-01',
      vote_average: 8.8,
      media_type: 'movie',
    },
    {
      id: 99002,
      title: 'Mbox_Ec Series Premium',
      overview: 'Maratones ininterrumpidas de series galardonadas y temporadas completas en alta definición.',
      poster_path: '/7pHMZ6EsZfs2qZu0Lv2UGtTo5MU.jpg',
      backdrop_path: '/m7eiSGHFzr584zFmetGqkqaU6BN.jpg',
      first_air_date: '2026-01-01',
      vote_average: 8.9,
      media_type: 'tv',
    },
    {
      id: 99003,
      title: 'Deportes y Eventos en Directo',
      overview: 'Transmisión exclusiva de eventos deportivos, fútbol y resúmenes de ligas internacionales.',
      poster_path: '/8G5vQyJbWd6nS374n2R5z6m4Z1v.jpg',
      backdrop_path: '/hZkgoQYus5vegHoetLkCJzb17zJ.jpg',
      release_date: '2026-01-01',
      vote_average: 8.5,
      media_type: 'movie',
    },
  ], []);

  // Títulos para el catálogo según filtro activo
  const displayedCatalogItems = useMemo(() => {
    if (selectedMediaType === 'live') {
      return liveChannels;
    }
    if (selectedMediaType === 'watchlist') {
      const list = currentUser?.watchlist || [];
      if (!searchQuery.trim()) return list;
      const q = searchQuery.toLowerCase().trim();
      return list.filter(
        (i) =>
          (i.title && i.title.toLowerCase().includes(q)) ||
          (i.name && i.name.toLowerCase().includes(q))
      );
    }
    return items;
  }, [selectedMediaType, currentUser?.watchlist, searchQuery, items, liveChannels, watchlistVersion]);

  // Lista de pósteres para el mosaico del modal de autenticación
  const moviePosterUrls = useMemo(() => {
    return items
      .filter((item) => Boolean(item.poster_path))
      .map((item) => getImageUrl(item.poster_path, 'w500'));
  }, [items]);

  // ==========================================================================
  // BLOQUEO TOTAL DE ACCESO (CONTENT GATE CERO-CONFIANZA)
  // Ningún contenido se expone si no existe una sesión verificada y ACTIVA
  // ==========================================================================
  if (!currentUser || currentUser.status !== 'ACTIVE') {
    return (
      <GoogleAuthGate
        onSuccess={(user) => {
          setCurrentUser(user);
          loadContent('all', '');
        }}
        moviePosters={moviePosterUrls}
        initialEmail="jj863620@gmail.com"
      />
    );
  }

  return (
    <div 
      className="min-h-[100dvh] bg-[#08080A] text-neutral-100 flex flex-col font-sans selection:bg-[#FF1A24] selection:text-white"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      
      {/* 1. Header Oficial Mbox_Ec con Isotipo Cinema Box 3D */}
      <header className="sticky top-0 z-40 w-full border-b border-neutral-900 bg-[#08080A]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          
          {/* Isotipo Oficial Cinema Box */}
          <div 
            onClick={() => {
              setWatchingItem(null);
              setSelectedMediaType('all');
              setSearchQuery('');
            }}
            className="cursor-pointer group flex items-center"
            title="Mbox_Ec: Tu cine en casa"
          >
            <CinemaBoxLogo size="md" showTagline={true} />
          </div>

          {/* Navegación Principal 100% en Español */}
          <nav className="flex items-center gap-2 sm:gap-4 md:gap-5 text-sm font-semibold">
            <button
              onClick={() => {
                setWatchingItem(null);
                setSelectedMediaType('all');
              }}
              className={`transition cursor-pointer text-xs sm:text-sm ${
                !watchingItem && selectedMediaType === 'all'
                  ? 'text-white font-black drop-shadow-[0_0_8px_rgba(255,26,36,0.6)]'
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
                  ? 'text-white font-black drop-shadow-[0_0_8px_rgba(255,26,36,0.6)]'
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
                  ? 'text-white font-black drop-shadow-[0_0_8px_rgba(255,26,36,0.6)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Series
            </button>

            {/* Canal En Vivo */}
            <button
              onClick={() => {
                setWatchingItem(null);
                setSelectedMediaType('live');
              }}
              className={`transition cursor-pointer text-xs sm:text-sm flex items-center gap-1.5 ${
                !watchingItem && selectedMediaType === 'live'
                  ? 'text-white font-black drop-shadow-[0_0_8px_rgba(255,26,36,0.6)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF1A24] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF1A24]" />
              </span>
              <span>En Vivo</span>
            </button>

            {/* Mi Lista */}
            <button
              onClick={() => {
                setWatchingItem(null);
                setSelectedMediaType('watchlist');
              }}
              className={`transition cursor-pointer text-xs sm:text-sm flex items-center gap-1.5 ${
                !watchingItem && selectedMediaType === 'watchlist'
                  ? 'text-white font-black drop-shadow-[0_0_8px_rgba(255,26,36,0.6)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Bookmark className="h-3.5 w-3.5 text-[#FF1A24]" />
              <span className="hidden sm:inline">Mi Lista</span>
              {currentUser?.watchlist && currentUser.watchlist.length > 0 && (
                <span className="rounded-full bg-neutral-900 border border-neutral-800 px-1.5 py-0.2 text-[10px] font-mono text-neutral-300">
                  {currentUser.watchlist.length}
                </span>
              )}
            </button>

            {/* BOTÓN OFICIAL DEL PANEL DE ADMINISTRACIÓN (SUPER ADMIN / PROPIETARIO) */}
            {isAdmin(currentUser) && (
              <button
                onClick={() => setIsAdminModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-[#FF1A24]/15 hover:bg-[#FF1A24]/30 text-[#FF1A24] hover:text-white border border-[#FF1A24]/50 px-3 py-1.5 text-xs font-black transition cursor-pointer shadow-lg shadow-red-950/50"
                title="Herramienta de Administración y Control Total de Usuarios"
              >
                <Crown className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                <span className="hidden md:inline">Panel Admin</span>
              </button>
            )}

            {/* Perfil del Usuario / Propietario */}
            <div className="flex items-center gap-2 pl-2 border-l border-neutral-800">
              <div
                onClick={() => {
                  if (isAdmin(currentUser)) setIsAdminModalOpen(true);
                }}
                className={`relative cursor-pointer group`}
                title={
                  currentUser.role === 'SUPER_ADMIN'
                    ? 'Propietario / Super Administrador (Haz clic para abrir el panel)'
                    : `Conectado como ${currentUser.email}`
                }
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl text-white font-black text-xs shadow-md ${currentUser.avatarColor}`}
                >
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                {/* Corona de Propietario o Check de Verificado */}
                <div 
                  className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#141419] border border-[#252530] shadow-xs"
                >
                  {currentUser.role === 'SUPER_ADMIN' ? (
                    <Crown className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                  ) : (
                    <ShieldCheck className="h-2.5 w-2.5 text-emerald-400" />
                  )}
                </div>
              </div>

              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs text-neutral-200 font-bold max-w-[120px] truncate leading-tight">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-neutral-400 font-mono max-w-[120px] truncate leading-tight">
                  {currentUser.email}
                </span>
              </div>

              {/* Botón de Cierre de Sesión */}
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-[#FF1A24] border border-neutral-800 transition cursor-pointer"
                title="Cerrar Sesión Segura"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>

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
            {/* Barra de Retorno y Favoritos */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-900">
              <button
                onClick={handleBackToCatalog}
                className="flex items-center gap-2 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 px-4 py-2 text-xs font-bold text-neutral-200 transition cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 text-[#FF1A24]" />
                <span>Volver al Catálogo</span>
              </button>

              <button
                onClick={() => handleToggleWatchlist(watchingItem)}
                className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                  isInWatchlist(watchingItem.id)
                    ? 'bg-red-950/70 border-red-800 text-red-400'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:text-white'
                }`}
              >
                {isInWatchlist(watchingItem.id) ? (
                  <>
                    <BookmarkCheck className="h-3.5 w-3.5" />
                    <span>Guardado en Mi Lista</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="h-3.5 w-3.5" />
                    <span>Añadir a Mi Lista</span>
                  </>
                )}
              </button>
            </div>

            {/* Reproductor Limpio y Profesional (VidSrc Oficial) */}
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

            {/* Detalles del Título y Tráiler Oficial */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              <div className="lg:col-span-2 rounded-2xl border border-neutral-900 bg-neutral-950/80 p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-900">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-white">
                      {watchingDetails?.title || watchingDetails?.name || watchingItem.title || watchingItem.name}
                    </h1>
                    <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1">
                      <span className="capitalize">{watchingItem.media_type === 'tv' ? 'Serie' : 'Película'}</span>
                      <span aria-hidden="true">·</span>
                      <span>{(watchingDetails?.release_date || watchingDetails?.first_air_date || watchingItem.release_date || watchingItem.first_air_date || '').split('-')[0] || '2026'}</span>
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
                      <Info className="h-3.5 w-3.5 text-[#FF1A24]" />
                      <span>Ver ficha técnica</span>
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

              {/* Tráiler Oficial en Español */}
              <div className="rounded-2xl border border-neutral-900 bg-neutral-950/80 p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-900">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wide">
                    <Play className="h-3.5 w-3.5 text-[#FF1A24] fill-[#FF1A24]" />
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
          /* Vista B: Catálogo Principal Mbox_Ec */
          <div>
            
            {/* Hero Banner Interactivo */}
            {!searchQuery.trim() && selectedMediaType !== 'watchlist' && selectedMediaType !== 'live' && items.length > 0 && (
              <HeroBanner
                items={items}
                onWatch={handleWatch}
                onDetail={setSelectedDetailItem}
                isItemInWatchlist={isInWatchlist}
                onToggleWatchlist={handleToggleWatchlist}
              />
            )}

            {/* Contenedor del Catálogo */}
            <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 space-y-6">
              
              {/* Barra de Filtros y Buscador */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-neutral-900">
                
                {/* Categorías */}
                <div className="flex flex-wrap items-center gap-1 p-1 bg-[#0E0F14] border border-neutral-800 rounded-xl text-xs self-start">
                  <button
                    onClick={() => setSelectedMediaType('all')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      selectedMediaType === 'all'
                        ? 'bg-[#FF1A24] text-white shadow-md shadow-red-950'
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
                        ? 'bg-[#FF1A24] text-white shadow-md shadow-red-950'
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
                        ? 'bg-[#FF1A24] text-white shadow-md shadow-red-950'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Tv className="h-3.5 w-3.5" />
                    <span>Series</span>
                  </button>

                  <button
                    onClick={() => setSelectedMediaType('live')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      selectedMediaType === 'live'
                        ? 'bg-[#FF1A24] text-white shadow-md shadow-red-950'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Radio className="h-3.5 w-3.5 text-red-500" />
                    <span>En Vivo</span>
                  </button>

                  <button
                    onClick={() => setSelectedMediaType('watchlist')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                      selectedMediaType === 'watchlist'
                        ? 'bg-[#FF1A24] text-white shadow-md shadow-red-950'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    <span>Mi Lista</span>
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
                    className="w-full rounded-xl border border-neutral-800 bg-[#0E0F14] pl-9 pr-8 py-2 text-xs text-white placeholder-neutral-500 focus:border-[#FF1A24] focus:outline-none transition"
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
                    {selectedMediaType === 'live'
                      ? 'Transmisiones y Canales En Vivo'
                      : selectedMediaType === 'watchlist'
                      ? 'Mi Lista Personal'
                      : searchQuery.trim()
                      ? `Resultados para "${searchQuery}"`
                      : 'Estrenos, Series y Tendencias'}
                  </h2>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {selectedMediaType === 'live'
                      ? 'Canales 24/7 de cine, series y eventos en español'
                      : 'Mbox_Ec: Tu cine en casa'}
                  </p>
                </div>

                {selectedMediaType !== 'watchlist' && selectedMediaType !== 'live' && (
                  <button
                    onClick={() => loadContent(selectedMediaType as MediaType, searchQuery)}
                    disabled={isLoading}
                    className="hidden sm:flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-xs text-neutral-300 hover:text-white transition cursor-pointer"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin text-[#FF1A24]' : ''}`} />
                    <span>Actualizar catálogo</span>
                  </button>
                )}
              </div>

              {/* Catálogo en Grid */}
              {isLoading && selectedMediaType !== 'watchlist' && selectedMediaType !== 'live' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4 md:gap-5">
                  {Array.from({ length: 10 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="aspect-[2/3] animate-pulse rounded-xl bg-neutral-950 border border-neutral-900"
                    />
                  ))}
                </div>
              ) : displayedCatalogItems.length === 0 ? (
                <div className="py-20 text-center text-neutral-500 space-y-3">
                  <Film className="h-12 w-12 mx-auto opacity-30 text-neutral-400" />
                  <p className="text-sm font-semibold text-neutral-300">No se encontraron títulos disponibles</p>
                  <p className="text-xs text-neutral-500">Prueba con otra búsqueda o filtro</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4 md:gap-5">
                  {displayedCatalogItems.map((item) => {
                    const title = item.title || item.name || 'Título';
                    const year = (item.release_date || item.first_air_date || '').split('-')[0] || '2026';
                    const rating = Number(item.vote_average || 0).toFixed(1);
                    const isTv = item.media_type === 'tv' || (!item.title && Boolean(item.name));
                    const posterUrl = getImageUrl(item.poster_path, 'w500');
                    const saved = isInWatchlist(item.id);

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
                        className="group relative flex flex-col overflow-hidden rounded-xl border border-neutral-900 bg-[#0E0F14] transition-all duration-300 hover:-translate-y-1.5 hover:border-neutral-700 hover:shadow-2xl hover:shadow-black cursor-pointer focus:outline-none focus:ring-4 focus:ring-[#FF1A24] focus:scale-[1.03]"
                      >
                        {/* Póster en Aspecto 2:3 */}
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

                          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black via-black/60 to-transparent" />

                          {/* Calificación */}
                          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded bg-black/85 px-2 py-0.5 text-xs font-bold text-amber-400 font-mono tabular-nums backdrop-blur-md border border-neutral-800 shadow">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span>{rating}</span>
                          </div>

                          {/* Botón de guardar rápido */}
                          <button
                            type="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleWatchlist(item);
                            }}
                            className={`absolute top-2.5 left-2.5 p-1.5 rounded-lg border backdrop-blur-md transition cursor-pointer ${
                              saved
                                ? 'bg-[#FF1A24] border-red-500 text-white'
                                : 'bg-black/70 border-neutral-800 text-neutral-300 hover:text-white opacity-0 group-hover:opacity-100'
                            }`}
                            title={saved ? 'En Mi Lista' : 'Guardar en Mi Lista'}
                          >
                            {saved ? (
                              <BookmarkCheck className="h-3.5 w-3.5" />
                            ) : (
                              <Bookmark className="h-3.5 w-3.5" />
                            )}
                          </button>

                          {/* Botón de reproducción flotante */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[1px] pointer-events-none">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FF1A24] text-white shadow-xl shadow-red-950 scale-90 group-hover:scale-100 transition-transform">
                              <Play className="h-5 w-5 fill-white ml-0.5" />
                            </div>
                          </div>
                        </div>

                        {/* Metadatos y Título */}
                        <div className="flex flex-1 flex-col justify-between p-3 space-y-1">
                          <h3 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#FF1A24] transition-colors">
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

      {/* MODAL DEL PANEL DE ADMINISTRACIÓN Y CONTROL TOTAL */}
      {isAdminModalOpen && (
        <AdminUsersModal
          isOpen={isAdminModalOpen}
          onClose={() => setIsAdminModalOpen(false)}
          currentUser={currentUser}
          onUserUpdated={refreshUserSession}
        />
      )}

      {/* BOTÓN FLOTANTE DE ACCESO RÁPIDO AL PANEL DE ADMINISTRACIÓN (SOLO PROPIETARIO) */}
      {isAdmin(currentUser) && (
        <aside aria-label="Herramienta de administración" className="fixed bottom-5 left-5 z-40 animate-in fade-in">
          <button
            onClick={() => setIsAdminModalOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-[#0E0F14]/95 hover:bg-neutral-900 text-white border border-[#FF1A24]/60 px-4 py-2.5 shadow-2xl shadow-black backdrop-blur-md transition-all hover:scale-105 cursor-pointer text-xs font-bold"
            title="Abrir Panel de Control Total de Usuarios (Super Admin)"
          >
            <Crown className="h-4 w-4 text-amber-400 fill-amber-400" />
            <span>Herramienta de Administración</span>
            <span className="rounded-full bg-[#FF1A24] px-1.5 py-0.5 text-[9px] text-white font-mono uppercase">
              Propietario
            </span>
          </button>
        </aside>
      )}

      {/* Modal de Ficha Técnica */}
      {selectedDetailItem && (
        <MediaDetailModal
          item={selectedDetailItem}
          onClose={() => setSelectedDetailItem(null)}
          onPlay={handleWatch}
        />
      )}

      {/* Footer Oficial Mbox_Ec */}
      <footer className="border-t border-neutral-900 bg-[#08080A] py-10 text-neutral-500 text-xs text-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <CinemaBoxLogo size="sm" showTagline={true} />

          <div className="flex flex-col sm:flex-row items-center gap-4 text-neutral-400">
            <div className="flex items-center gap-1.5 text-[11px]">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span>Control de Permanencia Activo (Super Admin: jj863620@gmail.com)</span>
            </div>
            <span className="hidden sm:inline text-neutral-700">·</span>
            <p>© 2026 Mbox_Ec · Tu cine en casa. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Indicador de conectividad Offline */}
      <OfflineIndicator />

    </div>
  );
}
