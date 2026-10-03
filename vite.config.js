import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      // Two pages: the main game, and Eonsmith (loaded in an iframe from the Game Hub)
      input: {
        main: resolve(__dirname, 'index.html'),
        eonsmith: resolve(__dirname, 'eonsmith.html'),
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});
