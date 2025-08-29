import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  const hmrHost = env.VITE_HMR_HOST || undefined;
  const hmrProtocol = (env.VITE_HMR_PROTOCOL as 'ws' | 'wss') || (env.HTTPS ? 'wss' : 'ws');
  const hmrClientPort = env.VITE_HMR_CLIENT_PORT ? parseInt(env.VITE_HMR_CLIENT_PORT, 10) : undefined;
  const hmrPort = env.VITE_HMR_PORT ? parseInt(env.VITE_HMR_PORT, 10) : undefined;

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      cors: true,
      hmr: hmrHost ? {
        host: hmrHost,
        protocol: hmrProtocol,
        clientPort: hmrClientPort,
        port: hmrPort,
      } : undefined,
      proxy: {
        '/api/zendesk': {
          target: 'https://moengage.zendesk.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/zendesk/, '/api/v2'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              // Add CORS headers
              proxyReq.setHeader('Origin', 'https://moengage.zendesk.com');
              proxyReq.setHeader('Referer', 'https://moengage.zendesk.com/');
            });
          }
        }
      }
    },
  }
})
