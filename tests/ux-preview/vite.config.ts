import { defineConfig, mergeConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import base from '../../vite.config';

// An explicit, separate dev entry. Production builds never resolve this adapter.
export default mergeConfig(base, defineConfig({
  cacheDir: 'node_modules/.vite-ux-preview',
  plugins: [{
    name: 'offline-ux-preview',
    enforce: 'pre',
    resolveId(id) {
      if (/(?:^|\/)lib\/supabase(?:\.ts)?$/.test(id)) return fileURLToPath(new URL('./supabase.mjs', import.meta.url));
    },
    transformIndexHtml(html) {
      return html.replace('<body>', '<body><div style="position:fixed;left:50%;top:0;transform:translateX(-50%);font:9px system-ui;color:#ffdb89;background:#111b;z-index:999999;pointer-events:none;white-space:nowrap">LOCAL PREVIEW · SAMPLE DATA</div>');
    },
  }],
  server: { host: '127.0.0.1', port: 6076, strictPort: true },
}));
