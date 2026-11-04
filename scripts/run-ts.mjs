// Run a TypeScript script through Vite's module loader, the one `npm run dev` uses for api/, so the script can
// import the api/ and lib/ modules as they are. The script's default export is called and awaited.
//
// Usage: node scripts/run-ts.mjs scripts/sos/save.ts
import path from 'node:path';
import { createServer } from 'vite';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/run-ts.mjs <script.ts>');
  process.exit(1);
}

const vite = await createServer({
  configFile: false,
  root: process.cwd(),
  appType: 'custom',
  logLevel: 'warn',
  server: { middlewareMode: true, hmr: false, ws: false },
  optimizeDeps: { noDiscovery: true },
});
try {
  const mod = await vite.ssrLoadModule(path.resolve(file));
  await mod.default();
} finally {
  await vite.close();
}
