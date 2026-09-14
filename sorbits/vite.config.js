import { defineConfig } from 'vite';

// Sorbits — a plain ES-modules + Canvas 2D + Web Audio game. No framework.
export default defineConfig({
  base: './', // build to relative paths so dist/ runs from any static host
  server: {
    host: true, // bind to all interfaces so the NetBird tunnel can reach the dev server
    // allow all Host headers — trusted personal dev server behind our own tunnel,
    // so we skip Vite's DNS-rebinding whitelist entirely
    allowedHosts: true,
  },
  build: {
    target: 'es2020',
  },
});
