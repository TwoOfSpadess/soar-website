import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5174,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      input: {
        // Two entry points: the marketing site, and the invite acceptance page
        // linked from invitation emails (served at /invite/).
        main: resolve(__dirname, 'index.html'),
        invite: resolve(__dirname, 'invite/index.html'),
      },
    },
  },
});
