import { env } from './env.js';
import { buildApp } from './app.js';

const PORT = env.port;
const HOST = env.host;

const app = await buildApp({ logger: true });

try {
  await app.fastify.listen({ port: PORT, host: HOST });
} catch (err) {
  app.fastify.log.error(err);
  process.exit(1);
}

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    void app.close().finally(() => process.exit(0));
  });
}
