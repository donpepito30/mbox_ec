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

/**
 * Cliente HTTP estricto con Bearer Token
 * Prioridad de idioma: español (es-ES / es-MX), con fallback automático
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

  const queryParams = new URLSearchParams({
    language: defaultLang,
    include_image_language: 'es,en,null',
    ...Object.fromEntries(
      Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    ),
  });

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
 * Prioriza contenido en español semanal
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
 * Obtiene detalles en español (es-ES). Si la sinopsis está vacía, busca en es-MX o fallback.
 */
export async function getMediaDetails(
  id: number | string,
  type: 'movie' | 'tv' = 'movie',
  appendToResponse: string = 'videos'
): Promise<MediaDetails> {
  const endpoint = `/${type}/${id}`;
  
  const params: Record<string, string> = {};
  const appendItems = appendToResponse ? (appendToResponse.includes('external_ids') ? appendToResponse : `${appendToResponse},external_ids`) : 'videos,external_ids';
  params.append_to_response = appendItems;

  let details = await tmdbFetch<MediaDetails>(
    endpoint,
    params,
    86400,
    'es-ES'
  );

  // Optimización de idioma: si la sinopsis en español está vacía, intentar complementar
  if (!details.overview || details.overview.trim() === '') {
    try {
      const fallbackDetails = await tmdbFetch<MediaDetails>(
        endpoint,
        params,
        86400,
        'es-MX'
      );
      if (fallbackDetails.overview && fallbackDetails.overview.trim() !== '') {
        details.overview = fallbackDetails.overview;
      }
    } catch {
      // Conservar detalles originales
    }
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
 * Optimizado para buscar primero en español (es-ES). Si no hay resultados o son escasos,
 * busca automáticamente en otros idiomas para encontrar cualquier título internacional.
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
  
  // Paso 1: Búsqueda en Español
  let response = await tmdbFetch<TMDBResponse<MediaItem>>(
    endpoint,
    { query: cleanQuery, include_adult: 'false' },
    3600,
    'es-ES'
  );

  // Paso 2: Si no hubo resultados en español o hay muy pocos, buscar en general (inglés / multilenguaje)
  if (!response.results || response.results.length === 0) {
    try {
      const multiLangResponse = await tmdbFetch<TMDBResponse<MediaItem>>(
        endpoint,
        { query: cleanQuery, include_adult: 'false' },
        3600,
        'en-US'
      );
      if (multiLangResponse.results && multiLangResponse.results.length > 0) {
        response = multiLangResponse;
      }
    } catch {
      // Conservar respuesta
    }
  }

  if (response.results) {
    response.results = response.results
      .filter((item) => item.poster_path || item.backdrop_path)
      .map((item) => ({
        ...item,
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
];

const MOCK_TRAILERS: Record<number, string> = {
  693134: 'Way9Dexny3w',
  124364: 'yHfPpsbYV_E',
  157336: 'zSWdZVtXT7E',
  94605: 'fXmAurh012s',
  569094: 'cqGjhVJWtEg',
  1396: 'HhesaQXLuRY',
  872585: 'uYPbbksJxIg',
  100088: 'uLtkt8BonwM',
  823464: 'lV1OOlGwExM',
  119051: 'Di310BC8UrU',
  550: 'qtRKdVHc-cE',
  94997: 'DotnJ7tTA34',
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
    const filtered = MOCK_TRENDING.filter(
      (item) =>
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.original_title && item.original_title.toLowerCase().includes(q)) ||
        (item.original_name && item.original_name.toLowerCase().includes(q)) ||
        item.overview.toLowerCase().includes(q)
    );
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
