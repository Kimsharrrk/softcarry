import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/run': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/download': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/clean': { target: 'http://127.0.0.1:4000', changeOrigin: true },
    }
  }
});
