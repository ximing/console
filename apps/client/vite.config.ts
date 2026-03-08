import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron/simple';
import renderer from 'vite-plugin-electron-renderer';
import { resolve } from 'path';

// Environment configuration for Electron
const isProduction = process.env.NODE_ENV === 'production';

// Production API URL
const API_PROD_URL = 'https://console.aimo.plus';

// Development API URL
const VITE_DEV_SERVER_URL = isProduction ? API_PROD_URL : 'http://localhost:5273';
const API_DEV_URL = isProduction ? API_PROD_URL : 'http://localhost:3100';
const SOCKET_PATH = isProduction ? '/tmp/console.sock' : '/tmp/dev-console.sock';
const define = {
  'process.env.VITE_DEV_SERVER_URL': JSON.stringify(VITE_DEV_SERVER_URL),
  'process.env.VITE_API_BASE_URL': JSON.stringify(isProduction ? API_PROD_URL : API_DEV_URL),
  'process.env.VITE_IS_ELECTRON': JSON.stringify(true),
  'process.env.VITE_IS_PRODUCTION': JSON.stringify(isProduction),
  'process.env.VITE_SOCKET_PATH': JSON.stringify(SOCKET_PATH),
};
export default defineConfig({
  define,
  plugins: [
    electron({
      main: {
        entry: 'src/main/index.ts',
        onstart({ startup }) {
          process.env.VITE_DEV_SERVER_URL = VITE_DEV_SERVER_URL;
          startup();
        },
        vite: {
          define,
          build: {
            sourcemap: true,
            minify: process.env.NODE_ENV === 'production',
            outDir: 'dist/main',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
      preload: {
        input: 'src/preload/index.ts',
        onstart({ reload }) {
          reload();
        },
        vite: {
          build: {
            sourcemap: true,
            minify: process.env.NODE_ENV === 'production',
            outDir: 'dist/preload',
            rollupOptions: {
              external: ['electron'],
              output: {
                format: 'cjs',
                entryFileNames: '[name].cjs',
              },
            },
          },
        },
      },
    }),
    renderer(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  appType: 'custom',
});
