import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // Relative base so the built SPA works from any static host subpath.
  base: command === 'build' ? './' : '/',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Libraries in chunks of their own: they change far less often than
        // the app, so a deploy leaves them cached, and they download in
        // parallel with it.
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          motion: ['motion'],
        },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    // Honour a PORT handed down by the environment, so tooling that assigns a
    // free port can run the dev server alongside another instance. Plain
    // `npm run dev` sets nothing and keeps the project's usual 3000.
    port: Number(process.env.PORT) || 3000,
    host: '0.0.0.0',
  },
}));
