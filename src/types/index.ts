/**
 * @license
 * CineLocal - Arquitectura Modular de Streaming y Publicidad Local
 * Interfaces de TypeScript para TMDb y Sistema de Anuncios Locales
 * Compatible con Next.js App Router y Cloudflare Pages
 */

// ============================================================================
// 1. TIPOS Y ESTRUCTURAS PARA TMDB (PELÍCULAS, SERIES Y FICHA TÉCNICA)
// ============================================================================

/**
 * Tipos de contenido multimedia soportados por TMDb
 */
export type MediaType = 'all' | 'movie' | 'tv';

/**
 * Ventana de tiempo para contenidos en tendencia
 */
export type TimeWindow = 'day' | 'week';

/**
 * Estructura estándar para elementos de contenido multimedia de TMDb
 * Compatible tanto con Películas (movie) como con Series (tv).
 */
export interface MediaItem {
  id: number;
  /** Título para películas */
  title?: string;
  /** Nombre para series de televisión */
  name?: string;
  /** Título original */
  original_title?: string;
  original_name?: string;
  /** Sinopsis del contenido */
  overview: string;
  /** Ruta relativa del póster vertical en los servidores de TMDb */
  poster_path: string | null;
  /** Ruta relativa del backdrop panorámico (16:9) */
  backdrop_path: string | null;
  /** Fecha de estreno (para películas, formato YYYY-MM-DD) */
  release_date?: string;
  /** Fecha del primer episodio (para series, formato YYYY-MM-DD) */
  first_air_date?: string;
  /** Calificación media de usuarios (0 - 10) */
  vote_average: number;
  /** Conteo total de votos */
  vote_count?: number;
  /** Tipo de medio ('movie' | 'tv' | 'all') */
  media_type: MediaType;
  /** Identificadores de géneros asociados */
  genre_ids?: number[];
  /** Índice de popularidad en TMDb */
  popularity?: number;
  /** Idioma original */
  original_language?: string;
  /** Indicador de contenido para adultos */
  adult?: boolean;
}

/**
 * Estructura especializada para Películas (TMDb Movie)
 */
export interface Movie extends MediaItem {
  media_type: 'movie';
  title: string;
  release_date: string;
}

/**
 * Estructura especializada para Series de Televisión (TMDb TV Show)
 */
export interface TVShow extends MediaItem {
  media_type: 'tv';
  name: string;
  first_air_date: string;
}

/**
 * Género cinematográfico o televisivo
 */
export interface Genre {
  id: number;
  name: string;
}

/**
 * Compañía de producción
 */
export interface ProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

/**
 * Miembro del elenco para fichas técnicas
 */
export interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
  order: number;
}

/**
 * Video oficial / Trailer de TMDb
 */
export interface MediaVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
}

/**
 * Ficha técnica detallada por ID obtenida mediante `getMediaDetails`
 */
export interface MediaDetails extends MediaItem {
  /** Géneros oficiales */
  genres: Genre[];
  /** Lema promocional */
  tagline?: string;
  /** Estado de emisión o estreno (Released, In Production, Ended, etc.) */
  status: string;
  /** Duración en minutos (típico en películas) */
  runtime?: number;
  /** Número de temporadas (típico en series) */
  number_of_seasons?: number;
  /** Número total de episodios (típico en series) */
  number_of_episodes?: number;
  /** Página web oficial */
  homepage?: string;
  /** Presupuesto en dólares (para películas) */
  budget?: number;
  /** Recaudación en dólares (para películas) */
  revenue?: number;
  /** Compañías de producción */
  production_companies: ProductionCompany[];
  /** Elenco principal */
  credits?: {
    cast: CastMember[];
  };
  /** Videos y trailers */
  videos?: {
    results: MediaVideo[];
  };
}

/**
 * Respuesta paginada estándar de la API de TMDb
 */
export interface TMDBResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}


// ============================================================================
// 2. TIPOS Y ESTRUCTURAS PARA EL SISTEMA DE ANUNCIOS LOCALES
// ============================================================================

/**
 * Posición estratégica del anuncio en la plataforma de streaming
 */
export type AdPosition =
  | 'banner_top'    // Banner superior / en cabecera
  | 'below_player'  // Banner publicitario inmediatamente debajo del reproductor
  | 'grid_inline'   // Banner insertado dentro de la cuadrícula o catálogo
  | 'hero-top'      // Alias para cabecera / hero
  | 'feed-inline'   // Alias para feed
  | 'sidebar'       // Banner vertical en panel lateral
  | 'footer'        // Banner en el pie de página
  | 'interstitial'; // Anuncio modal o previo a la reproducción

/**
 * Estructura de datos para Anuncios Locales
 * Permite a negocios de la zona geográfica patrocinar contenido o promocionarse
 */
export interface LocalAd {
  /** Identificador único del anuncio */
  id: string;
  /** Título o encabezado comercial del anuncio */
  title: string;
  /** URL de la imagen del banner o creatividad publicitaria */
  imageUrl: string;
  /** URL de destino a la que redirige al hacer clic (web local, WhatsApp, menú digital, etc.) */
  targetUrl: string;
  /** Posición de renderizado dentro de la interfaz */
  position: AdPosition;
  /** Estado de activación del anuncio (true = activo en rotación, false = pausado) */
  active: boolean;

  // Propiedades complementarias de valor agregado para el negocio local
  /** Nombre de la empresa o comercio local */
  businessName?: string;
  /** Breve descripción o mensaje promocional */
  description?: string;
  /** Categoría comercial (ej: 'Gastronomía', 'Comercio Local', 'Servicios', 'Cultura') */
  category?: string;
  /** Texto del botón de llamado a la acción (ej: 'Pedir Ahora', 'Ver Menú', 'Reservar') */
  callToAction?: string;
  /** Ubicación o barrio del negocio local (ej: 'Distrito Centro', 'Zona Norte') */
  locationBadge?: string;
  /** Teléfono o contacto directo */
  contactPhone?: string;
  /** Conteo acumulado de impresiones (vistas) */
  impressions?: number;
  /** Conteo acumulado de clics */
  clicks?: number;
  /** Prioridad de rotación (1 a 10) */
  priority?: number;
  /** Fecha de caducidad de la campaña (ISO string) */
  expiresAt?: string;
}

/**
 * Filtros para consultar anuncios locales
 */
export interface LocalAdFilter {
  position?: AdPosition;
  activeOnly?: boolean;
  category?: string;
}
