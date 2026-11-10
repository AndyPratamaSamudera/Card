import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repo root (works from src/ under tsx and from dist/ after build). */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/**
 * Load the root .env (if any). Variables already set in the real environment
 * win, so hosting platforms can still override them.
 */
export function loadEnv() {
  for (const file of [path.join(ROOT, '.env'), path.join(process.cwd(), '.env')]) {
    if (fs.existsSync(file)) {
      process.loadEnvFile(file);
      return file;
    }
  }
  return null;
}

loadEnv();

const port = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n < 65536 ? n : fallback;
};

export const env = {
  // PORT is the common convention on hosting platforms; SERVER_PORT is ours.
  port: port(process.env.SERVER_PORT ?? process.env.PORT, 4000),
  host: process.env.SERVER_HOST ?? process.env.HOST ?? '0.0.0.0',
};
