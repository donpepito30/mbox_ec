// Mbox_ec - Servicio de Conexión a TMDb Optimizado en Español y Multilenguaje
import {
  MediaDetails,
  MediaItem,
  MediaType,
  TimeWindow,
  TMDBResponse,
} from '../types/index.ts';

// ============================================================================
// CONFIGURACIÓN DE VARIABLES DE ENTORNO
// ============================================================================

const getReadAccessToken = (): string => {
  if (typeof window !== 'undefined') {
    const sessionToken = window.sessionStorage.getItem('tmdb_read_access_token');
    if (sessionToken && sessionToken.trim() !== '') return sessionToken.trim();
  }

  try {
    const nextToken = process.env.NEXT_PUBLIC_TMDB_READ_ACCESS_TOKEN;
    if (nextToken && nextToken.trim() !== '' && nextToken !== 'your_tmdb_v4_read_access_token_here') {
      return nextToken.trim();
    }
  } catch {}

  try {
    const metaNextToken = (import.meta as any).env?.NEXT_PUBLIC_TMDB_READ_ACCESS_TOKEN;
    if (metaNextToken && metaNextToken.trim() !== '' && metaNextToken !== 'your_tmdb_v4_read_access_token_here') {
      return metaNextToken.trim();
    }
    const metaViteToken = (import.meta as any).env?.VITE_TMDB_READ_ACCESS_TOKEN;
    if (metaViteToken && metaViteToken.trim() !== '' && metaViteToken !== 'your_tmdb_v4_read_access_token_here') {
      return metaViteToken.trim();
    }
  } catch {}

  return '';
};

function sanitizeBaseUrl(url?: string): string {
  if (!url || !url.trim()) return 'https://api.themoviedb.org/3';
  const trimmed = url.trim();
  if (trimmed.includes('api.themoviedb.org')) {
    return 'https://api.themoviedb.org/3';
  }
  return trimmed.split(/[\]\)\s]/)[0].replace(/\/$/, '');
}

const getBaseUrl = (): string => {
  try {
    const nextUrl = process.env.NEXT_PUBLIC_TMDB_BASE_URL;
    if (nextUrl && nextUrl.trim() !== '') {
      return sanitizeBaseUrl(nextUrl);
    }
  } catch {}

  try {
    const metaNextUrl = (import.meta as any).env?.NEXT_PUBLIC_TMDB_BASE_URL;
    if (metaNextUrl && metaNextUrl.trim() !== '') {
      return sanitizeBaseUrl(metaNextUrl);
    }
    const metaViteUrl = (import.meta as any).env?.VITE_TMDB_BASE_URL;
    if (metaViteUrl && metaViteUrl.trim() !== '') {
      return sanitizeBaseUrl(metaViteUrl);
    }
  } catch {}

  return 'https://api.themoviedb.org/3';
};

export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export function getImageUrl(
  path: string | null | undefined,
  size: 'w300' | 'w500' | 'w780' | 'w1280' | 'original' = 'w500'
): string {
  if (!path) {
    return 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80';
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${TMDB_IMAGE_BASE_URL}/${size}${cleanPath}`;
}

// ============================================================================
// CACHÉ EN MEMORIA PARA CLIENTE Y CLOUDFLARE PAGES EDGE
// ============================================================================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}
const memoryCache = new Map<string, CacheEntry<unknown>>();

export type SpanishVariant = 'es-MX' | 'es-ES';
const LANGUAGE_PREF_KEY = 'mbox_spanish_variant_v2';

/**
 * Obtiene la variante de español preferida
 */
export function getPreferredSpanishVariant(): SpanishVariant {
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LANGUAGE_PREF_KEY);
      if (stored === 'es-MX' || stored === 'es-ES') return stored;
    }
  } catch {}
  return 'es-ES'; // Español estándar completo por defecto
}

/**
 * Modifica la variante de español preferida
 */
export function setPreferredSpanishVariant(variant: SpanishVariant): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LANGUAGE_PREF_KEY, variant);
      memoryCache.clear();
    }
  } catch {}
}

/**
 * Cliente HTTP estricto con Bearer Token
 * Optimizado para NO filtrar ni descartar contenido:
 * - Idioma por defecto: Español estándar ('es-ES') para máxima cobertura de títulos y sinopsis
 * - SIN parámetros invasivos de región ('region=MX') que filtren el 90% de las películas internacionales
 * - SIN parámetros inválidos de imagen en endpoints de búsqueda o tendencias
 */
async function tmdbFetch<T>(
  endpoint: string,
  params: Record<string, string | number> = {},
  revalidateSeconds: number = 604800,
  defaultLang: string = 'es-ES'
): Promise<T> {
  const token = getReadAccessToken();
  const baseUrl = getBaseUrl();

  if (!token || token === 'your_tmdb_v4_read_access_token_here') {
    return handleFallbackData<T>(endpoint, params);
  }

  const queryParams = new URLSearchParams();
  
  // Establecer idioma si no viene especificado en params
  const langToUse = (params.language as string) || defaultLang;
  if (langToUse) {
    queryParams.set('language', langToUse);
  }

  // Incorporar parámetros limpios
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '' && key !== 'language') {
      queryParams.set(key, String(value));
    }
  }

  const queryString = queryParams.toString();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}${queryString ? `?${queryString}` : ''}`;

  const cacheKey = url;
  const now = Date.now();
  const cached = memoryCache.get(cacheKey);
  if (cached && now - cached.timestamp < revalidateSeconds * 1000) {
    return cached.data as T;
  }

  try {
    const headers: Record<string, string> = {
      accept: 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.warn(`[TMDb] Token de acceso no autorizado (HTTP 401). Utilizando datos de respaldo.`);
        return handleFallbackData<T>(endpoint, params);
      }
      throw new Error(`[TMDb Error] ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as T;
    memoryCache.set(cacheKey, { data, timestamp: now });
    return data;
  } catch (error) {
    console.warn(`[TMDb Fetch Fallback] Petición fallida: ${(error as Error).message}. Utilizando datos locales.`);
    return handleFallbackData<T>(endpoint, params);
  }
}

// ============================================================================
// FUNCIONES DE CATÁLOGO Y BÚSQUEDA MULTILINGÜE (PRIORIDAD ESPAÑOL)
// ============================================================================

/**
 * 1. getTrending(type, timeWindow)
 * Devuelve las tendencias globales completas con títulos y sinopsis en español
 */
export async function getTrending(
  type: MediaType = 'all',
  timeWindow: TimeWindow = 'week'
): Promise<TMDBResponse<MediaItem>> {
  const endpoint = `/trending/${type}/${timeWindow}`;
  
  const response = await tmdbFetch<TMDBResponse<MediaItem>>(
    endpoint,
    {},
    604800,
    'es-ES'
  );

  if (response.results) {
    response.results = response.results.map((item) => ({
      ...item,
      title: item.title || item.name || item.original_title || item.original_name,
      media_type: item.media_type || (type === 'all' ? (item.title ? 'movie' : 'tv') : type),
    }));
  }

  return response;
}

/**
 * 2. getMediaDetails(id, type, appendToResponse)
 * Obtiene la ficha técnica y trailers en español, con fallback limpio si falta sinopsis
 */
export async function getMediaDetails(
  id: number | string,
  type: 'movie' | 'tv' = 'movie',
  appendToResponse: string = 'videos'
): Promise<MediaDetails> {
  const endpoint = `/${type}/${id}`;
  
  const params: Record<string, string> = {
    append_to_response: appendToResponse.includes('videos')
      ? appendToResponse
      : `${appendToResponse},videos,external_ids`,
  };

  let details = await tmdbFetch<MediaDetails>(
    endpoint,
    params,
    86400,
    'es-ES'
  );

  // Si la sinopsis en español viene vacía de origen en TMDb, complementar con la versión original
  if (!details.overview || details.overview.trim() === '') {
    try {
      const origDetails = await tmdbFetch<MediaDetails>(
        endpoint,
        params,
        86400,
        'en-US'
      );
      if (origDetails.overview && origDetails.overview.trim() !== '') {
        details.overview = origDetails.overview;
      }
      if (!details.title && origDetails.title) {
        details.title = origDetails.title;
      }
    } catch {}
  }

  const resolvedImdbId = details.imdb_id || (details as any).external_ids?.imdb_id;

  return {
    ...details,
    imdb_id: resolvedImdbId,
    media_type: type,
  };
}

/**
 * 3. searchMedia(query, type)
 * Búsqueda amplia y tolerante:
 * - Prioriza títulos traducidos al español sin descartar ningún contenido
 * - No restringe por región para que todas las películas y series aparezcan
 * - Si el usuario busca un título original (ej. "Avengers", "The Matrix"), busca en el catálogo global
 */
export async function searchMedia(
  query: string,
  type: MediaType = 'all'
): Promise<TMDBResponse<MediaItem>> {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return getTrending(type);
  }

  const endpoint = type === 'all' ? '/search/multi' : `/search/${type}`;
  
  // Paso 1: Búsqueda con localización al español
  let response = await tmdbFetch<TMDBResponse<MediaItem>>(
    endpoint,
    { query: cleanQuery, include_adult: 'false' },
    3600,
    'es-ES'
  );

  // Paso 2: Si no hubo resultados en la búsqueda con filtro de idioma español
  // (por ejemplo si el término es un nombre propio o título en inglés no indexado),
  // buscar en el catálogo global para que NUNCA falte contenido
  if (!response.results || response.results.length === 0) {
    try {
      const globalResponse = await tmdbFetch<TMDBResponse<MediaItem>>(
        endpoint,
        { query: cleanQuery, include_adult: 'false', language: 'en-US' },
        3600
      );
      if (globalResponse.results && globalResponse.results.length > 0) {
        response = globalResponse;
      }
    } catch {}
  }

  if (response.results) {
    response.results = response.results
      .filter((item) => item.poster_path || item.backdrop_path)
      .map((item) => ({
        ...item,
        title: item.title || item.name || item.original_title || item.original_name,
        media_type: item.media_type || (type === 'all' ? (item.title ? 'movie' : 'tv') : type),
      }));
  }

  return response;
}

export function setRuntimeReadAccessToken(token: string): void {
  if (typeof window !== 'undefined') {
    if (token.trim()) {
      window.sessionStorage.setItem('tmdb_read_access_token', token.trim());
    } else {
      window.sessionStorage.removeItem('tmdb_read_access_token');
    }
    memoryCache.clear();
  }
}

export function hasActiveReadAccessToken(): boolean {
  const token = getReadAccessToken();
  return Boolean(token && token !== 'your_tmdb_v4_read_access_token_here');
}

export const setRuntimeApiKey = setRuntimeReadAccessToken;
export const hasActiveApiKey = hasActiveReadAccessToken;

// ============================================================================
// MOTOR DE CONTINGENCIA LOCAL CURADO EN ESPAÑOL
// ============================================================================

const MOCK_TRENDING: MediaItem[] = [
  // --- Películas Taquilleras, Clásicos y Estrenos ---
  {
    id: 693134,
    title: 'Dune: Parte Dos',
    original_title: 'Dune: Part Two',
    overview: 'Paul Atreides se une a Chani y a los Fremen mientras busca venganza contra los conspiradores que destruyeron a su familia. Ante la elección entre el amor de su vida y el destino del universo, debe evitar un futuro terrible que solo él puede prever.',
    poster_path: '/v2NN1TMK3ifuiEyawa3ukkcSOUQ.jpg',
    backdrop_path: '/eZ239CUp1d6OryZEBPnO2n87gMG.jpg',
    release_date: '2024-02-27',
    vote_average: 8.2,
    vote_count: 5310,
    media_type: 'movie',
    genre_ids: [878, 12],
    popularity: 432.5,
  },
  {
    id: 157336,
    title: 'Interestelar',
    original_title: 'Interstellar',
    overview: 'Un grupo de científicos y exploradores espaciales se embarca en la misión más importante de la historia humana: viajar más allá de nuestra galaxia para descubrir si el ser humano tiene un futuro entre las estrellas.',
    poster_path: '/d1QKiYtceF3GDtxvTFXFAqwwah9.jpg',
    backdrop_path: '/8sNiAPPYU14PUepFNeSNGUTiHW.jpg',
    release_date: '2014-11-05',
    vote_average: 8.5,
    vote_count: 34890,
    media_type: 'movie',
    genre_ids: [12, 18, 878],
    popularity: 290.4,
  },
  {
    id: 569094,
    title: 'Spider-Man: Cruzando el Multiverso',
    original_title: 'Spider-Man: Across the Spider-Verse',
    overview: 'Miles Morales es catapultado a través del Multiverso, donde se encuentra con un equipo de Spider-People encargados de proteger su propia existencia.',
    poster_path: '/37WcNMgNOMxdhT87MFl7tq7FM1.jpg',
    backdrop_path: '/kVd3a9YeLGkoeR50jGEXM6EqseS.jpg',
    release_date: '2023-05-31',
    vote_average: 8.4,
    vote_count: 6780,
    media_type: 'movie',
    genre_ids: [16, 28, 12, 878],
    popularity: 280.1,
  },
  {
    id: 872585,
    title: 'Oppenheimer',
    original_title: 'Oppenheimer',
    overview: 'La historia del científico estadounidense J. Robert Oppenheimer y su papel en el desarrollo de la bomba atómica durante el Proyecto Manhattan en la Segunda Guerra Mundial.',
    poster_path: '/mJRUREPjTqqMEKwEiM2sdmIGngz.jpg',
    backdrop_path: '/neeNHeXjMF5fXoCJRsOmkNGC7q.jpg',
    release_date: '2023-07-19',
    vote_average: 8.1,
    vote_count: 8900,
    media_type: 'movie',
    genre_ids: [18, 36],
    popularity: 260.0,
  },
  {
    id: 823464,
    title: 'Godzilla y Kong: El nuevo imperio',
    original_title: 'Godzilla x Kong: The New Empire',
    overview: 'Una nueva aventura que enfrenta al todopoderoso Kong y al temible Godzilla contra una colosal amenaza no descubierta oculta dentro de nuestro mundo.',
    poster_path: '/2YqZ6IyFk7menirwziJvfoVvSOh.jpg',
    backdrop_path: '/gvLG3Fnznkxl4SmYfcK8gUuqxM8.jpg',
    release_date: '2024-03-27',
    vote_average: 7.2,
    vote_count: 3600,
    media_type: 'movie',
    genre_ids: [28, 878, 12],
    popularity: 210.6,
  },
  {
    id: 550,
    title: 'El Club de la Pelea',
    original_title: 'Fight Club',
    overview: 'Un empleado de oficina insomne y un fabricante de jabón desentendido forman un club de lucha clandestino que evoluciona hacia algo mucho más grande.',
    poster_path: '/8G5vQyJbWd6nS374n2R5z6m4Z1v.jpg',
    backdrop_path: '/hZkgoQYus5vegHoetLkCJzb17zJ.jpg',
    release_date: '1999-10-15',
    vote_average: 8.4,
    vote_count: 28400,
    media_type: 'movie',
    genre_ids: [18],
    popularity: 240.2,
  },
  {
    id: 238,
    title: 'El Padrino',
    original_title: 'The Godfather',
    overview: 'El envejecido patriarca de una dinastía del crimen organizado en la Nueva York de posguerra transfiere el control de su imperio clandestino a su reacio hijo menor.',
    poster_path: '/gVoJszZc8eG0zPZfK6d1hF9xWb.jpg',
    backdrop_path: '/tmU7GeKVybMWFButWEGl2M4GeiP.jpg',
    release_date: '1972-03-14',
    vote_average: 8.7,
    vote_count: 19800,
    media_type: 'movie',
    genre_ids: [18, 80],
    popularity: 250.0,
  },
  {
    id: 240,
    title: 'El Padrino Parte II',
    original_title: 'The Godfather Part II',
    overview: 'Retrata los primeros años de vida de Vito Corleone en la Sicilia de 1920 y en Nueva York, mientras su hijo Michael expande el sindicato familiar por Las Vegas, Hollywood y Cuba.',
    poster_path: '/hek3koDUyRQk7FIhPXsa6mT2Zc3.jpg',
    backdrop_path: '/kGzFbGhp99zva6oZODq5atUegqi.jpg',
    release_date: '1974-12-20',
    vote_average: 8.6,
    vote_count: 12200,
    media_type: 'movie',
    genre_ids: [18, 80],
    popularity: 180.0,
  },
  {
    id: 155,
    title: 'Batman: El Caballero de la Noche',
    original_title: 'The Dark Knight',
    overview: 'Batman eleva su lucha contra el crimen con la ayuda del teniente Jim Gordon y el fiscal Harvey Dent, hasta que la amenaza psicopática de El Guasón (Joker) desata el caos en Ciudad Gótica.',
    poster_path: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    backdrop_path: '/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg',
    release_date: '2008-07-16',
    vote_average: 8.5,
    vote_count: 31800,
    media_type: 'movie',
    genre_ids: [18, 28, 80, 53],
    popularity: 290.0,
  },
  {
    id: 414906,
    title: 'The Batman',
    original_title: 'The Batman',
    overview: 'En su segundo año luchando contra el crimen, Batman explora la corrupción existente en Gotham City y el vínculo de la misma con su propia familia mientras persigue a El Acertijo.',
    poster_path: '/74xTEgt7R36Fpooo50r9T25onhq.jpg',
    backdrop_path: '/5P8SmMzSNYikXpxil6BYz9G660E.jpg',
    release_date: '2022-03-01',
    vote_average: 7.7,
    vote_count: 9800,
    media_type: 'movie',
    genre_ids: [80, 9648, 53],
    popularity: 210.0,
  },
  {
    id: 24428,
    title: 'Los Vengadores',
    original_title: 'The Avengers',
    overview: 'Nick Fury reúne a los héroes más poderosos de la Tierra para formar los Vengadores y detener al villano Loki y su ejército extraterrestre antes de que subyuguen la Tierra.',
    poster_path: '/RYMX2wcKCBAr24UyPD7xwmjaTn.jpg',
    backdrop_path: '/9BBTo63ANSmhC4e6r62OJFuK2GL.jpg',
    release_date: '2012-04-25',
    vote_average: 7.7,
    vote_count: 29800,
    media_type: 'movie',
    genre_ids: [28, 12, 878],
    popularity: 220.0,
  },
  {
    id: 299534,
    title: 'Vengadores: Endgame',
    original_title: 'Avengers: Endgame',
    overview: 'Tras los devastadores eventos de Infinity War, el universo está en ruinas. Con la ayuda de los aliados restantes, los Vengadores se reúnen una vez más para revertir las acciones de Thanos.',
    poster_path: '/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
    backdrop_path: '/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg',
    release_date: '2019-04-24',
    vote_average: 8.3,
    vote_count: 24900,
    media_type: 'movie',
    genre_ids: [12, 878, 28],
    popularity: 295.0,
  },
  {
    id: 533535,
    title: 'Deadpool y Wolverine',
    original_title: 'Deadpool & Wolverine',
    overview: 'Un apático Wade Wilson se esfuerza por llevar una vida civil. Pero cuando su mundo natal se enfrenta a una amenaza existencial, debe asociarse con un reacio Wolverine para salvarlo.',
    poster_path: '/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
    backdrop_path: '/yDHYTfA3R0jFYba16jBB1jv82EU.jpg',
    release_date: '2024-07-24',
    vote_average: 7.7,
    vote_count: 4200,
    media_type: 'movie',
    genre_ids: [28, 35, 878],
    popularity: 480.0,
  },
  {
    id: 76600,
    title: 'Avatar: El Camino del Agua',
    original_title: 'Avatar: The Way of Water',
    overview: 'Ambientada más de una década después de los acontecimientos de la primera película, cuenta la historia de la familia Sully, los problemas que los persiguen y los límites a los que llegan para mantenerse a salvo.',
    poster_path: '/bqbFHw6UeB8jW3Fw5nK7t7bE1YQ.jpg',
    backdrop_path: '/s16H6tpK2utvwDtzZ8Qy4qm5Emw.jpg',
    release_date: '2022-12-14',
    vote_average: 7.6,
    vote_count: 11200,
    media_type: 'movie',
    genre_ids: [878, 12, 28],
    popularity: 280.0,
  },
  {
    id: 19995,
    title: 'Avatar',
    original_title: 'Avatar',
    overview: 'En el exuberante mundo alienígena de Pandora viven los Na\'vi. Un ex marine parapléjico es enviado en una misión donde se debatirá entre seguir órdenes y proteger a ese mundo.',
    poster_path: '/kyeqWdyUXW608qlYkRqosgbbJyK.jpg',
    backdrop_path: '/vL5LR6WdxWPjC1d47101BsfG8wT.jpg',
    release_date: '2009-12-15',
    vote_average: 7.6,
    vote_count: 31000,
    media_type: 'movie',
    genre_ids: [28, 12, 14, 878],
    popularity: 210.0,
  },
  {
    id: 98,
    title: 'Gladiador',
    original_title: 'Gladiator',
    overview: 'En el año 180, el general hispanorromano Máximo Décimo Meridio es traicionado cuando el ambicioso Cómodo usurpa el trono y condena a su familia. Máximo es esclavizado y obligado a luchar como gladiador.',
    poster_path: '/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg',
    backdrop_path: '/Ar7Jtq12vH4UjG18ZpI3mJ2i9OQ.jpg',
    release_date: '2000-05-01',
    vote_average: 8.2,
    vote_count: 18100,
    media_type: 'movie',
    genre_ids: [28, 18, 12],
    popularity: 230.0,
  },
  {
    id: 597,
    title: 'Titanic',
    original_title: 'Titanic',
    overview: 'Una joven aristócrata se enamora de un bondadoso pero humilde artista a bordo del lujoso e ilusionante viaje inaugural del R.M.S. Titanic.',
    poster_path: '/9xjZS2rlVxm8SFx8kPC3aIGCOYQ.jpg',
    backdrop_path: '/6VmF2397vXqnUQz8Apv8t81fV4d.jpg',
    release_date: '1997-11-18',
    vote_average: 7.9,
    vote_count: 24700,
    media_type: 'movie',
    genre_ids: [18, 10749],
    popularity: 250.0,
  },
  {
    id: 603,
    title: 'Matrix',
    original_title: 'The Matrix',
    overview: 'Un pirata informático descubre que la realidad que percibe es en realidad una simulación creada por máquinas inteligentes para cultivar a los seres humanos como fuente de energía.',
    poster_path: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    backdrop_path: '/l4QHerTSbflUPzpWJ0I1m1G2i1d.jpg',
    release_date: '1999-03-30',
    vote_average: 8.2,
    vote_count: 25100,
    media_type: 'movie',
    genre_ids: [28, 878],
    popularity: 240.0,
  },
  {
    id: 27205,
    title: 'El Origen (Inception)',
    original_title: 'Inception',
    overview: 'Dom Cobb es un ladrón capaz de adentrarse en los sueños de la gente y hacerse con sus secretos. Para recuperar su vida, deberá realizar la misión inversa: implantar una idea en una mente.',
    poster_path: '/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg',
    backdrop_path: '/8ZTVqvKDQ8emSGUEMjsS4xRoCZo.jpg',
    release_date: '2010-07-15',
    vote_average: 8.4,
    vote_count: 36100,
    media_type: 'movie',
    genre_ids: [28, 878, 12],
    popularity: 260.0,
  },
  {
    id: 475557,
    title: 'Guasón (Joker)',
    original_title: 'Joker',
    overview: 'Arthur Fleck es un comediante incomprendido y marginado por la sociedad en Ciudad Gótica, cuyo descenso a la locura inspira una violenta revolución contracultural.',
    poster_path: '/v0Bisw22pY16i9iKqGsmY9aUe7b.jpg',
    backdrop_path: '/n6bUvigpRFqSwmPp1m2YADdbRBc.jpg',
    release_date: '2019-10-02',
    vote_average: 8.2,
    vote_count: 24500,
    media_type: 'movie',
    genre_ids: [80, 53, 18],
    popularity: 270.0,
  },
  {
    id: 1022789,
    title: 'Intensamente 2',
    original_title: 'Inside Out 2',
    overview: 'Riley entra en la adolescencia y el Cuartel General sufre una repentina demolición para hacer sitio a nuevas emociones inesperadas: Ansiedad, Envidia, Ennui y Vergüenza.',
    poster_path: '/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg',
    backdrop_path: '/xg27NrXi7VXCGUr7MG75UqLl6Vg.jpg',
    release_date: '2024-06-11',
    vote_average: 7.6,
    vote_count: 4800,
    media_type: 'movie',
    genre_ids: [16, 10751, 12, 35],
    popularity: 490.0,
  },
  {
    id: 354912,
    title: 'Coco',
    original_title: 'Coco',
    overview: 'Miguel es un joven con el sueño de convertirse en leyenda de la música a pesar de la prohibición de su familia. Su pasión le llevará a adentrarse en la colorida Tierra de los Muertos.',
    poster_path: '/7qNy9b35y3pY456f91XQ4bF357E.jpg',
    backdrop_path: '/askg3SMvhqEl4OL52YuvdtQw407.jpg',
    release_date: '2017-10-27',
    vote_average: 8.2,
    vote_count: 18900,
    media_type: 'movie',
    genre_ids: [16, 10751, 35, 14],
    popularity: 230.0,
  },
  {
    id: 808,
    title: 'Shrek',
    original_title: 'Shrek',
    overview: 'Para rescatar su amado pantano de las criaturas de cuento desterradas por Lord Farquaad, el ogro Shrek hace un pacto y viaja a rescatar a la bella princesa Fiona de un dragón feroz.',
    poster_path: '/iB64vpL3dIObOtMZgX3RqWjOGdeg.jpg',
    backdrop_path: '/s2bT29y0ngXxxu2IA8AO2320f2b.jpg',
    release_date: '2001-05-18',
    vote_average: 7.7,
    vote_count: 16200,
    media_type: 'movie',
    genre_ids: [16, 35, 14, 12],
    popularity: 210.0,
  },
  {
    id: 502356,
    title: 'Super Mario Bros: La Película',
    original_title: 'The Super Mario Bros. Movie',
    overview: 'Mientras trabajan bajo tierra reparando una tubería, los fontaneros de Brooklyn Mario y su hermano Luigi son transportados a un mundo mágico subterráneo lleno de peligros.',
    poster_path: '/qNBAXBIQlnOThrVvA6mA2B5ggV6.jpg',
    backdrop_path: '/9n2tJBplPbgR2ca05h6qL8tphVM.jpg',
    release_date: '2023-04-05',
    vote_average: 7.7,
    vote_count: 8500,
    media_type: 'movie',
    genre_ids: [16, 10751, 12, 14, 35],
    popularity: 260.0,
  },
  {
    id: 671,
    title: 'Harry Potter y la Piedra Filosofal',
    original_title: 'Harry Potter and the Philosopher\'s Stone',
    overview: 'En su undécimo cumpleaños, el huérfano Harry Potter descubre que es el hijo de dos magos poderosos y posee poderes mágicos únicos, ingresando al Colegio Hogwarts de Magia y Hechicería.',
    poster_path: '/wuMc08IPKEatf9rnMNYrMHxqxmp.jpg',
    backdrop_path: '/hziiv14OpD73u9gAak4XDDMu0O2.jpg',
    release_date: '2001-11-16',
    vote_average: 7.9,
    vote_count: 26700,
    media_type: 'movie',
    genre_ids: [12, 14],
    popularity: 240.0,
  },
  {
    id: 138843,
    title: 'El Conjuro',
    original_title: 'The Conjuring',
    overview: 'Basada en hechos reales, narra los escalofriantes acontecimientos que vivieron los investigadores de fenómenos paranormales Ed y Lorraine Warren al ayudar a una familia aterrorizada por una presencia oscura.',
    poster_path: '/wVYREutTvI2COtxqPPia13q98mg.jpg',
    backdrop_path: '/eCgP25UqR77hL9224b17y53Q9uO.jpg',
    release_date: '2013-07-18',
    vote_average: 7.5,
    vote_count: 11100,
    media_type: 'movie',
    genre_ids: [27, 53],
    popularity: 220.0,
  },
  {
    id: 603692,
    title: 'John Wick 4',
    original_title: 'John Wick: Chapter 4',
    overview: 'John Wick descubre una forma de derrotar a la Alta Mesa. Pero antes de ganar su libertad, debe enfrentarse a un nuevo enemigo con poderosas alianzas en todo el mundo.',
    poster_path: '/vZloFAK7NKnMGKEslUsDdmsQ5rm.jpg',
    backdrop_path: '/7I6VUdPj6tQECNHdviJkUHD2f89.jpg',
    release_date: '2023-03-22',
    vote_average: 7.8,
    vote_count: 6300,
    media_type: 'movie',
    genre_ids: [28, 53, 80],
    popularity: 250.0,
  },

  // --- Series Destacadas y Populares ---
  {
    id: 124364,
    name: 'From (Origen)',
    original_name: 'From',
    overview: 'Desvela el misterio de un pueblo de pesadilla en el centro de Norteamérica que atrapa a todos los que entran. Los habitantes luchan por mantener una apariencia de normalidad y buscar una salida.',
    poster_path: '/7pHMZ6EsZfs2qZu0Lv2UGtTo5MU.jpg',
    backdrop_path: '/m7eiSGHFzr584zFmetGqkqaU6BN.jpg',
    first_air_date: '2022-02-20',
    vote_average: 8.5,
    vote_count: 1420,
    media_type: 'tv',
    genre_ids: [18, 9648, 10765],
    popularity: 380.2,
  },
  {
    id: 94605,
    name: 'Arcane',
    original_name: 'Arcane',
    overview: 'En medio del conflicto entre las ciudades gemelas de Piltóver y Zaun, dos hermanas luchan en bandos opuestos de una guerra entre tecnologías mágicas y convicciones incompatibles.',
    poster_path: '/87C0wecB8bHb1PsrKBI4kJiEkgV.jpg',
    backdrop_path: '/5cvnxEHT3e39DvT6ARw4GNCFrB0.jpg',
    first_air_date: '2021-11-06',
    vote_average: 8.7,
    vote_count: 4210,
    media_type: 'tv',
    genre_ids: [16, 10765, 18],
    popularity: 310.8,
  },
  {
    id: 1396,
    name: 'Breaking Bad',
    original_name: 'Breaking Bad',
    overview: 'Un profesor de química de secundaria diagnosticado con cáncer de pulmón inoperable se asocia con un antiguo alumno para asegurar el futuro financiero de su familia fabricando y vendiendo metanfetamina.',
    poster_path: '/anFx9aTOOYqgS3v7x3R84Kz67ly.jpg',
    backdrop_path: '/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
    first_air_date: '2008-01-20',
    vote_average: 8.9,
    vote_count: 14500,
    media_type: 'tv',
    genre_ids: [18, 80],
    popularity: 340.5,
  },
  {
    id: 100088,
    name: 'The Last of Us',
    original_name: 'The Last of Us',
    overview: 'Veinte años después de que una plaga fungal destruyera la civilización moderna, Joel es contratado para sacar de contrabando a Ellie, una niña de 14 años, fuera de una opresiva zona de cuarentena militar.',
    poster_path: '/tNQWO6cNzQYCyvw36mUcAQQyf5F.jpg',
    backdrop_path: '/lY2DhbA7Hy44fAKddr06UrXWWaQ.jpg',
    first_air_date: '2023-01-15',
    vote_average: 8.6,
    vote_count: 5100,
    media_type: 'tv',
    genre_ids: [18, 10759],
    popularity: 295.3,
  },
  {
    id: 119051,
    name: 'Miércoles (Wednesday)',
    original_name: 'Wednesday',
    overview: 'Un misterio infundido detectivescamente y sobrenaturalmente que narra los años de Miércoles Addams como estudiante en la Academia Nevermore.',
    poster_path: '/bNKwoYqkCXfIhhr5Jz8slrsw32r.jpg',
    backdrop_path: '/iHSwvRVsRyxpX7FE7GbviaDvgGZ.jpg',
    first_air_date: '2022-11-23',
    vote_average: 8.5,
    vote_count: 8200,
    media_type: 'tv',
    genre_ids: [10765, 9648, 35],
    popularity: 275.4,
  },
  {
    id: 94997,
    name: 'La Casa del Dragón',
    original_name: 'House of the Dragon',
    overview: 'La historia de la Casa Targaryen, ambientada 200 años antes de los acontecimientos de Juego de Tronos, narrando la danza de dragones que marcó el inicio del fin de su dinastía.',
    poster_path: '/1X4h40fcB4WWUmIBK0auT4zRBAV.jpg',
    backdrop_path: '/etjA69JH5409ylMCEHgHEWyt0W7.jpg',
    first_air_date: '2022-08-21',
    vote_average: 8.4,
    vote_count: 4500,
    media_type: 'tv',
    genre_ids: [10765, 18, 10759],
    popularity: 360.5,
  },
  {
    id: 1399,
    name: 'Juego de Tronos',
    original_name: 'Game of Thrones',
    overview: 'Nueve familias nobles luchan por el control de las míticas tierras de Poniente, mientras un antiguo enemigo resurge tras milenios de letargo en el lejano norte.',
    poster_path: '/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg',
    backdrop_path: '/2OMB0ynKlyIenMJWI2Dy9IWT4c.jpg',
    first_air_date: '2011-04-17',
    vote_average: 8.4,
    vote_count: 23200,
    media_type: 'tv',
    genre_ids: [10765, 18, 10759],
    popularity: 390.0,
  },
  {
    id: 66732,
    name: 'Stranger Things',
    original_name: 'Stranger Things',
    overview: 'A raíz de la misteriosa desaparición de un niño, un pequeño pueblo descubre un misterio que involucra experimentos secretos, fuerzas sobrenaturales terroríficas y a una niña muy extraña.',
    poster_path: '/49WJfeN0moxb9IPfGn8AIqMGskD.jpg',
    backdrop_path: '/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
    first_air_date: '2016-07-15',
    vote_average: 8.6,
    vote_count: 17100,
    media_type: 'tv',
    genre_ids: [18, 10765, 9648],
    popularity: 330.0,
  },
  {
    id: 76479,
    name: 'The Boys',
    original_name: 'The Boys',
    overview: 'Un grupo de vigilantes se propone derribar a superhéroes corruptos que abusan de sus superpoderes en lugar de usarlos para el bien, respaldados por un conglomerado multimillonario.',
    poster_path: '/2zm7HQBxoRa9wF9hG0g4aU5q0fL.jpg',
    backdrop_path: '/nGsxrTqp4lKsyL79m40Y7i4oB7j.jpg',
    first_air_date: '2019-07-26',
    vote_average: 8.5,
    vote_count: 10400,
    media_type: 'tv',
    genre_ids: [10759, 10765],
    popularity: 350.0,
  },
  {
    id: 44217,
    name: 'Vikingos',
    original_name: 'Vikings',
    overview: 'Sigue las aventuras de Ragnar Lothbrok, el héroe más grande de su época, quien se alza para convertirse en el rey de las tribus vikingas tras explorar nuevas tierras al oeste.',
    poster_path: '/bQLrHIRNEkE3PdIWAcZHGhAY0i5.jpg',
    backdrop_path: '/lHe809R6aHwR4l88gW1X45vF3Yq.jpg',
    first_air_date: '2013-03-03',
    vote_average: 8.1,
    vote_count: 7300,
    media_type: 'tv',
    genre_ids: [10759, 18],
    popularity: 290.0,
  },
  {
    id: 60574,
    name: 'Peaky Blinders',
    original_name: 'Peaky Blinders',
    overview: 'Una célebre banda de gangsters de Birmingham, Inglaterra, en 1919, liderada por el feroz Thomas Shelby, busca ascender social y económicamente a cualquier precio tras la Primera Guerra Mundial.',
    poster_path: '/vUUqzWa2LnHIVqkaKVlVGkVcTTW.jpg',
    backdrop_path: '/272p4iLq1S7N19qLqKqB77nF3Gz.jpg',
    first_air_date: '2013-09-12',
    vote_average: 8.5,
    vote_count: 9900,
    media_type: 'tv',
    genre_ids: [18, 80],
    popularity: 310.0,
  },
  {
    id: 93405,
    name: 'El Juego del Calamar',
    original_name: 'Squid Game',
    overview: 'Cientos de jugadores con dificultades económicas aceptan una extraña invitación para competir en juegos infantiles. Adentro les espera un tentador premio y consecuencias mortales.',
    poster_path: '/dDlGfdVq3zTqA6n4s9rPq9b7e7g.jpg',
    backdrop_path: '/oaGvjB0DvdNDbdPt9YIKW89ogq7.jpg',
    first_air_date: '2021-09-17',
    vote_average: 7.8,
    vote_count: 14100,
    media_type: 'tv',
    genre_ids: [10759, 9648, 18],
    popularity: 370.0,
  },
  {
    id: 126308,
    name: 'Shōgun',
    original_name: 'Shōgun',
    overview: 'En el Japón de 1600, al borde de una guerra civil que definirá el siglo, Lord Toranaga lucha por su vida mientras un misterioso barco europeo encalla en un pueblo pesquero.',
    poster_path: '/7O4iVfOMQmdCSxhOg1WNzG1AgYT.jpg',
    backdrop_path: '/4bL5G6o9k1X4u87qVp9d8j3o7M7.jpg',
    first_air_date: '2024-02-27',
    vote_average: 8.5,
    vote_count: 1250,
    media_type: 'tv',
    genre_ids: [18, 10768],
    popularity: 390.0,
  },
  {
    id: 106379,
    name: 'Fallout',
    original_name: 'Fallout',
    overview: 'En un futuro Los Ángeles post-apocalíptico, los ciudadanos deben vivir en búnkeres subterráneos para protegerse de la radiación, los mutantes y los bandidos tras una guerra nuclear.',
    poster_path: '/AnsSKR9LuK0T9bZrfaZZxwIS0ol.jpg',
    backdrop_path: '/7P97B8F9uM78yJ9X14k88w5j3v7.jpg',
    first_air_date: '2024-04-10',
    vote_average: 8.3,
    vote_count: 2400,
    media_type: 'tv',
    genre_ids: [10759, 10765, 878],
    popularity: 380.0,
  },
];

const MOCK_TRAILERS: Record<number, string> = {
  693134: 'Way9Dexny3w',
  157336: 'zSWdZVtXT7E',
  569094: 'cqGjhVJWtEg',
  872585: 'uYPbbksJxIg',
  823464: 'lV1OOlGwExM',
  550: 'qtRKdVHc-cE',
  238: 'gVoJszZc8eG',
  240: 'hek3koDUyRQ',
  155: 'qJ2tW6WMUDu',
  414906: 'mqqft2x_Aa4',
  24428: 'eOrNdBpGMv8',
  299534: 'TcMBFSGVi1c',
  533535: '73_1biulkYk',
  76600: 'd9MyW72ELq0',
  19995: '5PSNL1qE6VY',
  98: 'owK1qxDselE',
  597: 'kVrqfYjkTdQ',
  603: 'm8e-FF8MsqU',
  27205: 'YoHD9XEInc0',
  475557: 'zAGVQLHvwOY',
  1022789: 'LEjhY15eCx0',
  354912: 'awzWdtCezDo',
  808: 'CwXOrWvPBP8',
  502356: 'SvJwEiy2Wok',
  671: 'VyHV0BRtdxo',
  138843: 'k10ETZ41q5o',
  603692: 'qEVUtrk8_B4',
  124364: 'yHfPpsbYV_E',
  94605: 'fXmAurh012s',
  1396: 'HhesaQXLuRY',
  100088: 'uLtkt8BonwM',
  119051: 'Di310BC8UrU',
  94997: 'DotnJ7tTA34',
  1399: 'KPLWWIOCOOQ',
  66732: 'b9EkMc79ZSU',
  76479: '06rueu_fh30',
  44217: 'mAl60ykBm4A',
  60574: 'oVzVdvGIC7U',
  93405: 'oqxAJKy0ii4',
  126308: 'yEf_0_E3R9U',
  106379: 'V-mugKDQDlg',
};

function handleFallbackData<T>(endpoint: string, params: Record<string, string | number>): T {
  if (endpoint.includes('/trending/')) {
    let filtered = [...MOCK_TRENDING];
    if (endpoint.includes('/movie/')) {
      filtered = filtered.filter((item) => item.media_type === 'movie');
    } else if (endpoint.includes('/tv/')) {
      filtered = filtered.filter((item) => item.media_type === 'tv');
    }

    return {
      page: 1,
      results: filtered,
      total_pages: 1,
      total_results: filtered.length,
    } as unknown as T;
  }

  if (endpoint.includes('/search/')) {
    const q = String(params.query || '').toLowerCase().trim();
    const isMovieQuery = endpoint.includes('/movie');
    const isTvQuery = endpoint.includes('/tv');

    let pool = [...MOCK_TRENDING];
    if (isMovieQuery) {
      pool = pool.filter((item) => item.media_type === 'movie');
    } else if (isTvQuery) {
      pool = pool.filter((item) => item.media_type === 'tv');
    }

    if (!q) {
      return {
        page: 1,
        results: pool,
        total_pages: 1,
        total_results: pool.length,
      } as unknown as T;
    }

    const queryWords = q.split(/\s+/).filter(Boolean);

    const filtered = pool.filter((item) => {
      const titleStr = (item.title || '').toLowerCase();
      const nameStr = (item.name || '').toLowerCase();
      const origTitleStr = (item.original_title || '').toLowerCase();
      const origNameStr = (item.original_name || '').toLowerCase();
      const overviewStr = (item.overview || '').toLowerCase();

      // Coincidencia exacta o frase completa
      if (
        titleStr.includes(q) ||
        nameStr.includes(q) ||
        origTitleStr.includes(q) ||
        origNameStr.includes(q) ||
        overviewStr.includes(q)
      ) {
        return true;
      }

      // Coincidencia por palabras individuales (tolerante a variaciones)
      return queryWords.some(
        (word) =>
          titleStr.includes(word) ||
          nameStr.includes(word) ||
          origTitleStr.includes(word) ||
          origNameStr.includes(word) ||
          overviewStr.includes(word)
      );
    });

    return {
      page: 1,
      results: filtered,
      total_pages: 1,
      total_results: filtered.length,
    } as unknown as T;
  }

  const matches = endpoint.match(/\/(movie|tv)\/(\d+)/);
  if (matches) {
    const type = matches[1] as 'movie' | 'tv';
    const id = parseInt(matches[2], 10);
    const found = MOCK_TRENDING.find((item) => item.id === id);

    const baseItem: MediaItem = found || {
      id,
      title: type === 'movie' ? 'Producción Oficial' : undefined,
      name: type === 'tv' ? 'Serie Oficial' : undefined,
      overview: 'Sinopsis y detalles en idioma español preparados para su reproducción en alta fidelidad.',
      poster_path: '/v2NN1TMK3ifuiEyawa3ukkcSOUQ.jpg',
      backdrop_path: '/eZ239CUp1d6OryZEBPnO2n87gMG.jpg',
      release_date: '2024-03-01',
      vote_average: 8.3,
      vote_count: 2450,
      media_type: type,
    };

    const trailerKey = MOCK_TRAILERS[id] || 'Way9Dexny3w';

    const details: MediaDetails = {
      ...baseItem,
      genres: [
        { id: 18, name: 'Drama' },
        { id: 878, name: 'Ciencia Ficción' },
        { id: 12, name: 'Aventura' },
      ],
      tagline: 'Disfruta del mejor contenido en streaming con audio y subtítulos en español.',
      status: 'Estrenada',
      runtime: type === 'movie' ? 142 : undefined,
      number_of_seasons: type === 'tv' ? 2 : undefined,
      number_of_episodes: type === 'tv' ? 16 : undefined,
      production_companies: [
        { id: 1, name: 'Estudios de Cine', logo_path: null, origin_country: 'US' },
      ],
      videos: {
        results: [
          {
            id: `video-${id}`,
            key: trailerKey,
            name: `${baseItem.title || baseItem.name} - Tráiler Oficial en Español`,
            site: 'YouTube',
            type: 'Trailer',
            official: true,
          },
        ],
      },
    };

    return details as unknown as T;
  }

  return {
    page: 1,
    results: MOCK_TRENDING,
    total_pages: 1,
    total_results: MOCK_TRENDING.length,
  } as unknown as T;
}
