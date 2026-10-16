// Inject the server-rendered home page into dist/index.html so content paints before JS runs.
import { readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(root, 'dist', 'index.html');
const ssrDir = path.join(root, 'dist-ssr');

const { render } = await import(path.join(ssrDir, 'entry-server.js'));
const appHtml = render();

const template = await readFile(htmlPath, 'utf8');
const marker = '<div id="root"></div>';
if (!template.includes(marker)) {
  throw new Error(`prerender: could not find ${marker} in dist/index.html`);
}

await writeFile(htmlPath, template.replace(marker, `<div id="root">${appHtml}</div>`));
await rm(ssrDir, { recursive: true, force: true });
console.log(`prerender: injected ${(appHtml.length / 1024).toFixed(1)} KB of home page HTML`);
