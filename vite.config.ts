import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const proxyTarget = (env.VITE_PROXY_URL || 'http://localhost:3001').replace(/\/+$/, '');

  return {
    plugins: [react()],
    envPrefix: 'VITE_', // Vite standard prefix for client-exposed env vars
    server: {
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
