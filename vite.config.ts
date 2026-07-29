import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          // i18next-browser-languagedetector was dropped 2026-07-29: the loader
          // in src/i18n/index.ts resolves the startup language itself, because
          // the detector would pick a language whose lazy chunk had not been
          // fetched yet and cause a visible English-then-swap first paint.
          i18n: ['i18next', 'react-i18next'],
        },
      },
    },
  },
});
