import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const proxyTarget = (env.VITE_PROXY_URL || 'http://localhost:3001').replace(/\/+$/, '');

  return {
    plugins: [react()],
    envPrefix: 'VITE_', // Vite standard prefix for client-exposed env vars
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            const normalizedId = id.replace(/\\/g, '/');
            const markdownPackages = [
              '/react-markdown/',
              '/remark-gfm/',
              '/remark-parse/',
              '/remark-rehype/',
              '/remark-stringify/',
              '/unified/',
              '/micromark/',
              '/mdast-util-',
              '/hast-util-',
              '/rehype-',
              '/vfile/',
              '/unist-util-',
              '/property-information/',
              '/space-separated-tokens/',
              '/comma-separated-tokens/',
            ];

            if (markdownPackages.some(pkg => normalizedId.includes(pkg))) {
              return 'markdown-vendor';
            }
          },
        },
      },
    },
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
