import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';

// Portable client-only build: no hosting SDK, server, or authentication gateway.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': new URL('.', import.meta.url).pathname.replace(/\/$/, '') } },
  css: { postcss: { plugins: [tailwindcss()] } },
  build: { outDir: 'dist-static' },
});
