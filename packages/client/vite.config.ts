import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// One .env at the repo root is shared with the server.
const ROOT = path.resolve(__dirname, '../..');

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, ROOT, ''), ...process.env };
  const serverPort = Number(env.SERVER_PORT ?? env.PORT ?? 4000);
  const clientPort = Number(env.CLIENT_PORT ?? 3000);
  const clientHost = env.CLIENT_HOST ?? '0.0.0.0';
  // Proxy to the address the backend actually listens on. A wildcard bind
  // (0.0.0.0 / ::) accepts loopback, so use 127.0.0.1 for it.
  const serverHost = env.SERVER_HOST ?? env.HOST ?? '0.0.0.0';
  const proxyHost = ['0.0.0.0', '::', ''].includes(serverHost) ? '127.0.0.1' : serverHost;
  const target = `http://${proxyHost.includes(':') ? `[${proxyHost}]` : proxyHost}:${serverPort}`;

  return {
    plugins: [react()],
    envDir: ROOT,
    server: {
      port: clientPort,
      host: clientHost,
      strictPort: true,
      proxy: {
        '/socket.io': { target, ws: true },
        '/health': target,
      },
    },
    preview: { port: clientPort, host: clientHost, proxy: { '/socket.io': { target, ws: true } } },
  };
});
