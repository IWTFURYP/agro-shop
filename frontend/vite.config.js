import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    open: true,
    // Запити /api/..., карта сайту та robots.txt перенаправляються на бекенд
    proxy: {
      '/api': 'http://localhost:3000',
      '/sitemap.xml': 'http://localhost:3000',
      '/robots.txt': 'http://localhost:3000',
    },
  },
});
