import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During local dev we run two servers:
//   - Vite (this server, :5173) serves the SPA and handles its own asset/route
//     resolution — so the catch-all SPA rewrite in vercel.json can't break it.
//   - `vercel dev` (:3000) runs the /api serverless functions.
// The proxy below forwards /api calls from Vite to `vercel dev`, so the browser
// only ever talks to :5173. In production both are served from the same origin,
// so no proxy is needed there.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
