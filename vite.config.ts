import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

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
      plugins: [react(), preloadHeroFonts()],
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
