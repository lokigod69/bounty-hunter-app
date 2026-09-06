import { defineConfig, mergeConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import base from '../../vite.config';
import hosting from '../../vercel.json';

// An explicit, separate dev entry. Production builds never resolve this adapter.
export default mergeConfig(base, defineConfig({
  cacheDir: 'node_modules/.vite-ux-preview',
  define: {
    'import.meta.env.VITE_CONTACT_SAFETY_ENABLED': JSON.stringify('true'),
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('http://127.0.0.1:6076'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('offline-preview-public-key'),
  },
  plugins: [{
    name: 'offline-ux-preview',
    enforce: 'pre',
    resolveId(id, importer) {
      const candidate = id.startsWith('.') && importer ? path.resolve(path.dirname(importer), id).replace(/\\/g, '/') : id;
      if (/(?:^|\/)lib\/supabase(?:\.ts)?$/.test(candidate)) return fileURLToPath(new URL('./supabase.mjs', import.meta.url));
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace('</body>', '<script type="module" src="/tests/ux-preview/toolbar.mjs"></script></body>');
      },
    },
  }],
  server: { host: '127.0.0.1', port: 6076, strictPort: true },
  // Compiled fixture exercises the production response policy; HMR development
  // keeps Vite's own requirements separate.
  preview: { headers: Object.fromEntries(hosting.headers[0].headers.map(({ key, value }) => [key, value])) },
}));
