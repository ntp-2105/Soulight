import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    proxy: {
      '/ws': { target: 'ws://localhost:5080', ws: true },
    },
  },
  build: {
    sourcemap: true,
  },
});
