// Mbox_ec - Hero Banner Interactivo con Carrusel de Portadas y Miniaturas
// Estilo Cinemático Netflix / Disney+ con navegación fluida por mando y ratón
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Info,
  Star,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react';
import { MediaItem } from '../types/index.ts';
import { getImageUrl } from '../services/tmdb.ts';

interface HeroBannerProps {
  items: MediaItem[];
  onWatch: (item: MediaItem) => void;
  onDetail: (item: MediaItem) => void;
  isItemInWatchlist?: (id: number | string) => boolean;
  onToggleWatchlist?: (item: MediaItem) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  items,
  onWatch,
  onDetail,
  isItemInWatchlist,
  onToggleWatchlist,
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const featuredList = items.slice(0, 6);
  const activeItem = featuredList[activeIndex] || featuredList[0];

  // Rotación automática cada 7 segundos si el usuario no tiene el cursor encima
  useEffect(() => {
    if (featuredList.length <= 1 || isPaused) return;

    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % featuredList.length);
    }, 7000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [featuredList.length, isPaused]);

  if (!activeItem) return null;

  const title = activeItem.title || activeItem.name || 'Producción Destacada';
  const year = (activeItem.release_date || activeItem.first_air_date || '').split('-')[0] || '2024';
  const rating = Number(activeItem.vote_average || 0).toFixed(1);
  const backdropUrl = getImageUrl(activeItem.backdrop_path || activeItem.poster_path, 'original');
  const isTv = activeItem.media_type === 'tv';
  const isSaved = isItemInWatchlist ? isItemInWatchlist(activeItem.id) : false;

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + featuredList.length) % featuredList.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % featuredList.length);
  };

  return (
    <section 
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full overflow-hidden border-b border-neutral-900 bg-black min-h-[520px] sm:min-h-[580px] lg:min-h-[640px] flex items-center"
    >
      {/* Fondo Panorámico con Transición Suave */}
      <div className="absolute inset-0 z-0">
        <img
          key={activeItem.id}
          src={backdropUrl}
          alt={title}
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1280&auto=format&fit=crop&q=80';
          }}
          className="h-full w-full object-cover object-top opacity-50 transition-opacity duration-1000 animate-in fade-in"
        />
        {/* Degradados Cinemáticos Obsidian */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-transparent" />
      </div>

      {/* Flechas de Navegación del Banner */}
      <button
        type="button"
        tabIndex={0}
        onClick={handlePrev}
        className="absolute left-3 top-1/2 -translate-y-1/2 z-20 hidden md:flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-neutral-900 border border-neutral-800 transition cursor-pointer backdrop-blur-sm"
        title="Anterior"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <button
        type="button"
        tabIndex={0}
        onClick={handleNext}
        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 hidden md:flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white hover:bg-neutral-900 border border-neutral-800 transition cursor-pointer backdrop-blur-sm"
        title="Siguiente"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Contenido Principal y Carrusel de Portadas */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16 w-full flex flex-col justify-between gap-8">
        
        {/* Bloque Izquierdo: Información y Botones de Acción */}
        <div className="max-w-2xl space-y-4">
          
          {/* Metadatos superiores */}
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
            <span className="text-[#FF1A24] font-black tracking-wide">
              Mbox_Ec
            </span>
            <span aria-hidden="true" className="text-neutral-700">·</span>
            <span className="text-emerald-400 font-bold">
              Español Latino
            </span>
            <span aria-hidden="true" className="text-neutral-700">·</span>
            <span className="text-neutral-300 font-bold">
              Tendencias
            </span>
            <span aria-hidden="true" className="text-neutral-700">·</span>
            <span className="capitalize text-neutral-300">
              {isTv ? 'Serie' : 'Película'}
            </span>
            <span aria-hidden="true" className="text-neutral-700">·</span>
            <span className="font-mono text-neutral-300">{year}</span>
          </div>

          {/* Título Principal */}
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl text-balance leading-none drop-shadow-md">
            {title}
          </h1>

          {/* Calificación */}
          <div className="flex items-center gap-3 text-sm text-neutral-300">
            <span className="flex items-center gap-1 font-bold text-amber-400 font-mono tabular-nums">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {rating}
            </span>
            {activeItem.vote_count && (
              <>
                <span aria-hidden="true" className="text-neutral-700">|</span>
                <span className="text-xs text-neutral-400 font-mono tabular-nums">
                  {activeItem.vote_count.toLocaleString()} valoraciones
                </span>
              </>
            )}
          </div>

          {/* Sinopsis */}
          <p className="line-clamp-3 text-sm sm:text-base leading-relaxed text-neutral-300 max-w-xl">
            {activeItem.overview || 'Sinopsis completa disponible en la plataforma.'}
          </p>

          {/* Botones de acción */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              tabIndex={0}
              onClick={() => onWatch(activeItem)}
              className="inline-flex items-center gap-2.5 rounded-xl bg-[#FF1A24] px-6 py-3 text-sm font-bold text-white shadow-xl shadow-red-950/70 hover:bg-[#FF242E] transition-all cursor-pointer group"
            >
              <Play className="h-4 w-4 fill-white group-hover:scale-110 transition-transform" />
              <span>Comenzar a ver</span>
            </button>

            <button
              type="button"
              tabIndex={0}
              onClick={() => onDetail(activeItem)}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900/90 px-5 py-3 text-sm font-semibold text-neutral-200 hover:bg-neutral-800 transition cursor-pointer"
            >
              <Info className="h-4 w-4 text-[#FF1A24]" />
              <span>Ver ficha técnica</span>
            </button>

            {onToggleWatchlist && (
              <button
                type="button"
                tabIndex={0}
                onClick={() => onToggleWatchlist(activeItem)}
                className={`p-3 rounded-xl border transition cursor-pointer ${
                  isSaved
                    ? 'bg-red-950/60 border-red-700 text-red-400'
                    : 'border-neutral-800 bg-neutral-900/80 text-neutral-300 hover:text-white'
                }`}
                title={isSaved ? 'En Mi Lista' : 'Añadir a Mi Lista'}
              >
                {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
              </button>
            )}
          </div>

        </div>

        {/* Bloque Inferior: Miniaturas Interactivas de Portadas de Películas */}
        <div className="w-full pt-4">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Títulos Destacados
            </span>
            {/* Indicadores de Puntos */}
            <div className="flex items-center gap-1.5">
              {featuredList.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    activeIndex === idx ? 'w-6 bg-red-600' : 'w-2 bg-neutral-700 hover:bg-neutral-500'
                  }`}
                  aria-label={`Ir al título ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          {/* Carrusel de Mini-Portadas */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
            {featuredList.map((item, idx) => {
              const itemPoster = getImageUrl(item.poster_path, 'w300');
              const itemTitle = item.title || item.name || 'Título';
              const isSelected = activeIndex === idx;

              return (
                <button
                  key={item.id}
                  type="button"
                  tabIndex={0}
                  onClick={() => setActiveIndex(idx)}
                  className={`group relative flex-shrink-0 w-24 sm:w-28 md:w-32 aspect-[2/3] rounded-xl overflow-hidden border transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? 'border-2 border-red-600 scale-105 shadow-xl shadow-red-950 ring-2 ring-red-600/40'
                      : 'border-neutral-800/80 opacity-70 hover:opacity-100 hover:scale-102'
                  }`}
                  title={itemTitle}
                >
                  <img
                    src={itemPoster}
                    alt={itemTitle}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  <span className="absolute bottom-1.5 inset-x-1 text-[10px] font-bold text-white truncate text-center">
                    {itemTitle}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
};
