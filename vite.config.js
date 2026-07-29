import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // ruta relativa: funciona igual en GitHub Pages, Netlify o abriendo el archivo
  base: './',
  plugins: [react()],
  build: { outDir: 'dist', assetsDir: 'assets' },
});
