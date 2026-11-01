/**
 * @license
 * CineLocal - Vista de Detalle y Reproducción (/watch/[id])
 * Server Component de Next.js App Router
 * Consume getMediaDetails con append_to_response=videos
 * Extrae tráiler oficial de YouTube y muestra sinopsis, estreno y calificación en tonos Slate
 */

import React from 'react';
import {
  ArrowLeft,
  Star,
  Calendar,
  Clock,
  Tv,
  Film,
  Play,
  Share2,
  CheckCircle,
} from 'lucide-react';
import { getMediaDetails, getImageUrl } from '../../../services/tmdb.ts';
import { Player } from '../../../components/Player.tsx';
import { MediaVideo } from '../../../types/index.ts';

// Configuración de Edge Runtime para Cloudflare Pages
export const runtime = 'edge';

interface WatchPageProps {
  params: Promise<{ id: string }> | { id: string };
  searchParams?: Promise<{ type?: string; season?: string; episode?: string }> | { type?: string; season?: string; episode?: string };
}

export default async function WatchPage(props: WatchPageProps) {
  const resolvedParams = await props.params;
  const resolvedSearchParams = props.searchParams ? await props.searchParams : {};
  
  const id = resolvedParams.id;
  const type = (resolvedSearchParams.type === 'tv' ? 'tv' : 'movie') as 'movie' | 'tv';
  const season = resolvedSearchParams.season ? parseInt(resolvedSearchParams.season, 10) : 1;
  const episode = resolvedSearchParams.episode ? parseInt(resolvedSearchParams.episode, 10) : 1;

  // 1. Consultar ficha técnica completa combinando videos con append_to_response=videos
  const details = await getMediaDetails(id, type, 'videos');

  const title = details.title || details.name || 'Título de Producción';
  const releaseDate = details.release_date || details.first_air_date || '';
  const releaseYear = releaseDate.split('-')[0] || '2024';
  const rating = Number(details.vote_average || 0).toFixed(1);
  const backdropUrl = getImageUrl(details.backdrop_path || details.poster_path, 'original');
  const posterUrl = getImageUrl(details.poster_path, 'w500');

  // 2. Extraer el tráiler oficial de YouTube de la respuesta
  const videos: MediaVideo[] = details.videos?.results || [];
  const officialTrailer =
    videos.find((v) => v.site === 'YouTube' && v.type === 'Trailer' && v.official) ||
    videos.find((v) => v.site === 'YouTube' && v.type === 'Trailer') ||
    videos.find((v) => v.site === 'YouTube' && (v.type === 'Teaser' || v.type === 'Clip')) ||
    videos.find((v) => v.site === 'YouTube');

  const formatRuntime = (mins?: number) => {
    if (!mins) return null;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-rose-600 selection:text-white">
      
      {/* Barra Superior con Navegación y Acciones */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <a
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver al Catálogo</span>
          </a>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="truncate max-w-[180px] sm:max-w-md font-medium text-slate-200">
              {title}
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="font-mono text-slate-400">{releaseYear}</span>
          </div>
        </div>
      </header>

      {/* Contenedor Principal: Mobile-First Layout */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-8">
        
        {/* Sección A: Reproductor Multiservidor Adaptativo (VidSrc / 2Embed) */}
        <section aria-label="Reproductor de Streaming" className="w-full">
          <Player
            tmdbId={id}
            type={type}
            season={season}
            episode={episode}
            title={title}
          />
        </section>

        {/* Sección B: Grid Mobile-First (Detalles Técnicos + Tráiler Oficial de YouTube) */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
          
          {/* Columna 1 y 2: Metadatos, Sinopsis Completa, Calificación y Ficha */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-7 space-y-5 shadow-lg">
              
              {/* Encabezado y Calificación */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                    <span className="flex items-center gap-1 text-rose-400 font-semibold">
                      {type === 'tv' ? <Tv className="h-3.5 w-3.5" /> : <Film className="h-3.5 w-3.5" />}
                      {type === 'tv' ? 'Serie de Televisión' : 'Largometraje'}
                    </span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      <span>{releaseDate || releaseYear}</span>
                    </span>
                    {details.runtime && (
                      <>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          <span>{formatRuntime(details.runtime)}</span>
                        </span>
                      </>
                    )}
                    {details.number_of_seasons && (
                      <>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span className="font-mono">{details.number_of_seasons} Temporadas</span>
                      </>
                    )}
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {title}
                  </h1>

                  {details.tagline && (
                    <p className="text-xs sm:text-sm text-slate-400 italic">
                      "{details.tagline}"
                    </p>
                  )}
                </div>

                {/* Badge de Calificación Oficial TMDb con números tabulares */}
                <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
                  <div className="flex items-center gap-1.5 rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2 text-sm font-bold text-amber-400 font-mono tabular-nums shadow-sm">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span>{rating}</span>
                    <span className="text-slate-500 font-normal text-xs font-sans">/ 10</span>
                  </div>
                  {details.vote_count && (
                    <div className="text-left text-[11px] text-slate-400 font-mono">
                      <div className="text-slate-200 font-semibold">{details.vote_count.toLocaleString()}</div>
                      <div className="text-slate-500">votos</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sinopsis Completa */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Sinopsis Oficial
                </h3>
                <p className="text-sm sm:text-base text-slate-200 leading-relaxed">
                  {details.overview || 'Sinopsis no facilitada por la distribuidora en este momento.'}
                </p>
              </div>

              {/* Géneros */}
              {details.genres && details.genres.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Géneros
                  </h3>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {details.genres.map((g) => (
                      <span
                        key={g.id}
                        className="rounded-lg bg-slate-800/80 border border-slate-700/60 px-3 py-1 text-slate-300 font-medium"
                      >
                        {g.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Productoras y Metadatos Extra */}
              {details.production_companies && details.production_companies.length > 0 && (
                <div className="pt-3 border-t border-slate-800/80 text-xs text-slate-400 flex flex-wrap items-center gap-2">
                  <span className="text-slate-500">Producción:</span>
                  <span className="text-slate-300">
                    {details.production_companies.map((p) => p.name).join(', ')}
                  </span>
                </div>
              )}

            </div>

          </div>

          {/* Columna 3: Tráiler Oficial de YouTube extraído con append_to_response=videos */}
          <div className="space-y-6">
            
            {officialTrailer ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3.5 shadow-lg">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-100 uppercase tracking-wide">
                    <Play className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
                    <span>Tráiler Oficial en YouTube</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Oficial
                  </span>
                </div>

                {/* Reproductor de YouTube para el tráiler oficial */}
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black border border-slate-800 shadow-md">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${officialTrailer.key}?rel=0&modestbranding=1`}
                    title={`${title} - Tráiler Oficial`}
                    allowFullScreen
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    className="h-full w-full border-0"
                  />
                </div>

                <div className="text-xs text-slate-400 truncate font-medium">
                  {officialTrailer.name}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-center text-slate-400 space-y-2">
                <Film className="h-8 w-8 mx-auto text-slate-600" />
                <p className="text-xs font-medium">Tráiler no disponible en este momento</p>
              </div>
            )}

            {/* Póster de la Obra y Acciones */}
            <div className="hidden lg:block rounded-2xl border border-slate-800 bg-slate-900/40 p-4 overflow-hidden">
              <div className="aspect-[2/3] w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                <img
                  src={posterUrl}
                  alt={`Póster oficial de ${title}`}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

          </div>

        </section>

      </main>

    </div>
  );
}
