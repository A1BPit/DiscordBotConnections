import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// envDir points at the repo root so VITE_DISCORD_CLIENT_ID lives in the same
// .env as the bot's config.
export default defineConfig({
  plugins: [react()],
  envDir: '../',
  server: {
    port: 5173,
    // Requests arrive via the cloudflared tunnel hostname during dev.
    allowedHosts: true,
    proxy: {
      // Activity client calls /.proxy/api/...; Discord strips /.proxy in prod.
      // This rewrite lets the same paths work when hitting Vite directly in dev.
      '/.proxy/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/\.proxy/, ''),
      },
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
    hmr: {
      clientPort: 443,
    },
  },
});
