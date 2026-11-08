import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

function sanitizeTmdbUrl(rawUrl?: string): string {
  if (!rawUrl) return 'https://api.themoviedb.org/3';
  const trimmed = rawUrl.trim();
  if (trimmed.includes('api.themoviedb.org')) {
    return 'https://api.themoviedb.org/3';
  }
  return trimmed.split(/[\]\)\s]/)[0].replace(/\/$/, '');
}

export default defineConfig(() => {
  const tmdbToken =
    process.env.NEXT_PUBLIC_TMDB_READ_ACCESS_TOKEN ||
    process.env.VITE_TMDB_READ_ACCESS_TOKEN ||
    '';
  const tmdbBaseUrl = sanitizeTmdbUrl(
    process.env.NEXT_PUBLIC_TMDB_BASE_URL ||
    process.env.VITE_TMDB_BASE_URL ||
    'https://api.themoviedb.org/3'
  );

  return {
    plugins: [react(), tailwindcss()],
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    define: {
      'process.env.NEXT_PUBLIC_TMDB_READ_ACCESS_TOKEN': JSON.stringify(tmdbToken),
      'process.env.NEXT_PUBLIC_TMDB_BASE_URL': JSON.stringify(tmdbBaseUrl),
      'process.env.VITE_TMDB_READ_ACCESS_TOKEN': JSON.stringify(tmdbToken),
      'process.env.VITE_TMDB_BASE_URL': JSON.stringify(tmdbBaseUrl),
      'import.meta.env.NEXT_PUBLIC_TMDB_READ_ACCESS_TOKEN': JSON.stringify(tmdbToken),
      'import.meta.env.NEXT_PUBLIC_TMDB_BASE_URL': JSON.stringify(tmdbBaseUrl),
      'process.env': JSON.stringify({
        NEXT_PUBLIC_TMDB_READ_ACCESS_TOKEN: tmdbToken,
        NEXT_PUBLIC_TMDB_BASE_URL: tmdbBaseUrl,
        NODE_ENV: process.env.NODE_ENV || 'development',
      }),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@firebase-config': fs.existsSync(path.resolve(__dirname, 'firebase-applet-config.json'))
          ? path.resolve(__dirname, 'firebase-applet-config.json')
          : path.resolve(__dirname, 'src/config/firebase-config.defaults.json'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
