import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on mode (for future use)
  loadEnv(mode, process.cwd(), '');
  const isElectron = process.env.ELECTRON === 'true';

  return {
    // Inject environment variables
    define: {},
    base: isElectron ? './' : '/',
    plugins: [react()],
    resolve: {
      extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.d.ts'],
      alias: {
        '@x-console/dto': path.resolve(__dirname, '../../packages/dto/dist/index.d.ts'),
      },
    },
    server: {
      port: 5273,
      proxy: {
        '/api': {
          target: 'http://localhost:3100',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://localhost:3100',
          ws: true,
          changeOrigin: true,
        },
        '/collaboration': {
          target: 'http://localhost:3100',
          ws: true,
          changeOrigin: true,
        },
      },
    },
    build: {
      // Output to different locations based on target (Electron vs server)
      // For Electron: output to apps/client/dist directly (not dist/web)
      // This way /logo.png will be found at dist/logo.png
      outDir: isElectron ? path.resolve(__dirname, '../client/dist') : '../server/public',
      emptyOutDir: true,

      // Optimize chunk size
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            // Vendor libraries
            if (id.includes('node_modules')) {
              if (id.includes('react')) {
                return 'vendor-react';
              }
              if (id.includes('lucide-react') || id.includes('@headlessui')) {
                return 'vendor-ui';
              }
              if (id.includes('axios') || id.includes('@rabjs')) {
                return 'vendor-libs';
              }
              return 'vendor-other';
            }

            // Separate page chunks
            if (id.includes('/pages/')) {
              const match = id.match(/\/pages\/(\w+)\//);
              if (match) {
                return `page-${match[1]}`;
              }
            }

            // Services
            if (id.includes('/services/')) {
              return 'services';
            }

            // Components
            if (id.includes('/components/')) {
              return 'components';
            }
          },
        },
      },

      // Minimize
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },

      // Inline small static imports
      assetsInlineLimit: 4096,

      // CSS code splitting
      cssCodeSplit: true,

      // Source map for production debugging
      sourcemap: false,

      // Optimize chunk size threshold
      chunkSizeWarningLimit: 1000,

      // Report compressed size
      reportCompressedSize: false,
    },
  };
});
