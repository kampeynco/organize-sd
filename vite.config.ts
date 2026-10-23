import path from 'path';
import fs from 'fs';
import type { IncomingMessage } from 'http';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const readBody = (req: IncomingMessage) =>
  new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

/**
 * Run the Vercel functions in api/ under `npm run dev`. Without this, Vite answers /api/<name> with the
 * function's own source code. (`vercel dev` can't serve this app: its rewrite to index.html also catches
 * Vite's modules.) Each api/<name>.ts exports a handler per HTTP method that takes a Request and returns a Response.
 */
const devApi = (): Plugin => ({
  name: 'dev-api',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
      const name = url.pathname.match(/^\/api\/([\w-]+)$/)?.[1];
      if (!name || !fs.existsSync(path.resolve(__dirname, 'api', `${name}.ts`))) return next();
      try {
        const handlers = await server.ssrLoadModule(`/api/${name}.ts`);
        const handler = handlers[req.method ?? 'GET'];
        if (typeof handler !== 'function') {
          res.statusCode = 405;
          return res.end();
        }
        const headers = Object.entries(req.headers).flatMap(([key, value]): [string, string][] =>
          value === undefined ? [] : [[key, Array.isArray(value) ? value.join(', ') : value]]
        );
        const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
        const response: Response = await handler(
          new Request(url, { method: req.method, headers, body: hasBody ? await readBody(req) : undefined })
        );
        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(Buffer.from(await response.arrayBuffer()));
      } catch (err) {
        next(err);
      }
    });
  },
});

/**
 * Preload every font weight the hero uses so they all arrive in one wave alongside the CSS.
 * Otherwise weights are only discovered after the CSS parses, and text visibly swaps after first paint.
 */
const preloadHeroFonts = (): Plugin => ({
  name: 'preload-hero-fonts',
  apply: 'build',
  transformIndexHtml(_html, ctx) {
    const patterns = [
      /big-shoulders-display-latin-(800|900)-normal.*\.woff2$/,
      /public-sans-latin-(400|500|600|700)-normal.*\.woff2$/,
    ];
    return Object.keys(ctx.bundle ?? {})
      .filter((file) => patterns.some((re) => re.test(file)))
      .map((file) => ({
        tag: 'link',
        attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `/${file}`, crossorigin: '' },
        injectTo: 'head' as const,
      }));
  },
});

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), preloadHeroFonts(), devApi()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
