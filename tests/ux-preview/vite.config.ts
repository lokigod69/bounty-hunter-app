import { defineConfig, mergeConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import base from '../../vite.config';
import hosting from '../../vercel.json';

// An explicit, separate dev entry. Production builds never resolve this adapter.
export default mergeConfig(base, defineConfig({
  cacheDir: 'node_modules/.vite-ux-preview',
  plugins: [{
    name: 'offline-ux-preview',
    enforce: 'pre',
    resolveId(id) {
      if (/(?:^|\/)lib\/supabase(?:\.ts)?$/.test(id)) return fileURLToPath(new URL('./supabase.mjs', import.meta.url));
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
