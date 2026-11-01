/**
 * @license
 * CineLocal - Plataforma de Streaming
 * Página Principal (Server Component de Next.js App Router)
 * Layout Mobile-First (2 columnas mobile a 5 columnas desktop)
 * Configuración para Cloudflare Pages Edge Runtime (@cloudflare/next-on-pages)
 * Paleta basada estrictamente en tonos Slate y modo oscuro
 */

import React from 'react';
import { Star, Play, Film, Tv, Flame, Sparkles, Clapperboard } from 'lucide-react';
import { getTrending, getImageUrl } from '../services/tmdb.ts';
import { MediaItem } from '../types/index.ts';

// Configuración de Edge Runtime para Cloudflare Pages
export const runtime = 'edge';

// Revalidación ISR semanal en Next.js (604.800 segundos)
export const revalidate = 604800;

export default async function HomePage() {
  // Consumir contenidos en tendencia de la semana desde TMDb mediante Bearer Token
  const trendingResponse = await getTrending('all', 'week');
  const items = trendingResponse.results || [];

  // Contenido #1 en tendencia para el Hero Banner principal
  const featuredItem: MediaItem | undefined = items[0];
  // Películas y series restantes para la cuadrícula del catálogo
  const catalogItems: MediaItem[] = items.slice(1);

  const featuredTitle = featuredItem?.title || featuredItem?.name || 'Producción Destacada';
  const featuredYear = (featuredItem?.release_date || featuredItem?.first_air_date || '').split('-')[0] || '2024';
  const featuredRating = Number(featuredItem?.vote_average || 0).toFixed(1);
  const featuredBackdrop = getImageUrl(featuredItem?.backdrop_path || featuredItem?.poster_path, 'original');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-rose-600 selection:text-white">
      
      {/* 1. Header Minimalista con Logo, Blur de Fondo y Navegación Limpia */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md transition-colors">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          
          {/* Logo Minimalista */}
          <a href="/" className="flex items-center gap-2.5 group cursor-pointer">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-600 text-white shadow-md shadow-rose-950/40 group-hover:bg-rose-500 transition-colors">
              <Clapperboard className="h-5 w-5" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">
              Cine<span className="text-rose-500">Local</span>
            </span>
          </a>

          {/* Navegación Limpia */}
          <nav className="flex items-center gap-6 text-sm font-medium text-slate-300">
            <a href="/" className="text-white font-semibold transition-colors">
              Explorar
            </a>
            <a href="/movies" className="hover:text-white transition-colors hidden sm:inline-block">
              Películas
            </a>
            <a href="/series" className="hover:text-white transition-colors hidden sm:inline-block">
              Series
            </a>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 bg-rose-950/50 border border-rose-900/40 px-2.5 py-1 rounded-full">
              <Flame className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
              <span>Tendencias</span>
            </div>
          </nav>

        </div>
      </header>

      <main className="flex-1 pb-16">
        
        {/* 2. Hero Banner en la Cabecera (Contenido #1 en Tendencia) */}
        {featuredItem && (
          <section className="relative w-full overflow-hidden border-b border-slate-900 bg-slate-950">
            {/* Backdrop oficial panorámico con degradado a tonos Slate oscuros */}
            <div className="absolute inset-0 z-0">
              <img
                src={featuredBackdrop}
                alt={featuredTitle}
                className="h-full w-full object-cover object-top opacity-35 transition-transform duration-700 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/20" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
            </div>

            <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
              <div className="max-w-2xl space-y-4">
                
                {/* Etiqueta de Contenido Destacado */}
                <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-300">
                  <span className="flex items-center gap-1 font-semibold text-rose-400">
                    <Sparkles className="h-3.5 w-3.5" />
                    #1 en Tendencias esta semana
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="capitalize text-slate-400">
                    {featuredItem.media_type === 'tv' ? 'Serie de TV' : 'Película'}
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="font-mono text-slate-400">{featuredYear}</span>
                </div>

                {/* Título Principal */}
                <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl text-balance leading-none">
                  {featuredTitle}
                </h1>

                {/* Calificación y metadatos limpios */}
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="flex items-center gap-1 font-bold text-amber-400 font-mono tabular-nums">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {featuredRating}
                  </span>
                  {featuredItem.vote_count && (
                    <>
                      <span aria-hidden="true" className="text-slate-700">|</span>
                      <span className="text-xs text-slate-400 font-mono tabular-nums">
                        {featuredItem.vote_count.toLocaleString()} valoraciones
                      </span>
                    </>
                  )}
                </div>

                {/* Sinopsis Corta */}
                <p className="line-clamp-3 text-sm sm:text-base leading-relaxed text-slate-300 max-w-xl">
                  {featuredItem.overview || 'Sinopsis completa disponible en la ficha técnica.'}
                </p>

                {/* Botón interactivo "Ver Ahora" hacia /watch/[id] */}
                <div className="pt-2">
                  <a
                    href={`/watch/${featuredItem.id}`}
                    className="inline-flex items-center gap-2.5 rounded-xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-950/50 hover:bg-rose-500 hover:shadow-rose-900/40 transition-all cursor-pointer group"
                  >
                    <Play className="h-4 w-4 fill-white group-hover:scale-110 transition-transform" />
                    <span>Ver Ahora</span>
                  </a>
                </div>

              </div>
            </div>
          </section>
        )}

        {/* 3. Catálogo en Grid Bento / Clean (Mobile-First: 2 columnas a 5 columnas) */}
        <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 space-y-6">
          
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Catálogo de Estrenos y Series Populares
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Selecciona cualquier título para iniciar la reproducción al instante
              </p>
            </div>
            <div className="text-xs font-mono text-slate-400">
              {catalogItems.length} títulos disponibles
            </div>
          </div>

          {/* Grid Responsivo: 2 cols mobile, 3 en tablets, 4 en laptops, 5 en desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4 md:gap-5">
            {catalogItems.map((item) => {
              const title = item.title || item.name || 'Título';
              const year = (item.release_date || item.first_air_date || '').split('-')[0] || '—';
              const rating = Number(item.vote_average || 0).toFixed(1);
              const isTv = item.media_type === 'tv' || (!item.title && Boolean(item.name));
              const posterUrl = getImageUrl(item.poster_path, 'w500');

              return (
                <a
                  key={item.id}
                  href={`/watch/${item.id}`}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/50 transition-all duration-300 hover:-translate-y-1 hover:border-slate-700 hover:shadow-xl hover:shadow-black/70 cursor-pointer"
                >
                  {/* Póster de TMDb en Aspecto 2:3 con animación hover suave */}
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-950">
                    <img
                      src={posterUrl}
                      alt={`Póster de ${title}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
                    />

                    {/* Gradiente en la base del póster */}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent opacity-80" />

                    {/* Badge de Calificación (Estrellas) en la esquina superior derecha */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded bg-slate-950/85 px-2 py-0.5 text-xs font-semibold text-amber-400 font-mono tabular-nums backdrop-blur-md border border-slate-800/90 shadow-md">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span>{rating}</span>
                    </div>

                    {/* Botón flotante de reproducción rápida en hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-950/80 scale-90 group-hover:scale-100 transition-transform">
                        <Play className="h-5 w-5 fill-white ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Metadatos y Título Truncado */}
                  <div className="flex flex-1 flex-col justify-between p-3 sm:p-3.5 space-y-1">
                    <h3 className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-rose-400 transition-colors">
                      {title}
                    </h3>

                    <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-400">
                      <span className="flex items-center gap-1 text-slate-400">
                        {isTv ? <Tv className="h-3 w-3 text-slate-500" /> : <Film className="h-3 w-3 text-slate-500" />}
                        <span>{isTv ? 'Serie' : 'Película'}</span>
                      </span>
                      <span className="font-mono tabular-nums text-slate-400">{year}</span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>

        </div>
      </main>

      {/* Footer Minimalista en tonos Slate */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-slate-500 text-xs text-center">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <p>© {new Date().getFullYear()} CineLocal Streaming · Desplegado en Cloudflare Pages · Powered by TMDb API</p>
        </div>
      </footer>

    </div>
  );
}
