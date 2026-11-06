// Inject server-rendered pages into the built HTML so content paints before JS loads: the home page into
// dist/index.html, and the results page into dist/results.html (served at /results, see vercel.json).
import { readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const ssrDir = path.join(root, 'dist-ssr');

const { render } = await import(path.join(ssrDir, 'entry-server.js'));

const config = JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'));
const csp = config.headers.flatMap(rule => rule.headers).find(header => header.key === 'Content-Security-Policy')?.value;

const template = await readFile(path.join(dist, 'index.html'), 'utf8');
const marker = '<div id="root"></div>';
if (!template.includes(marker)) {
  throw new Error(`prerender: could not find ${marker} in dist/index.html`);
}

// The results page's code and first data start downloading with the HTML, instead of after the app's
// JavaScript runs. The data depends on the view in the address (?view=turnout or ?view=registration, and
// &by=district for the district map). The URLs match lib/electionResults.ts, lib/voterTurnout.ts and
// lib/voterRegistration.ts, so the page's fetch() picks up these responses.
const resultsChunk = (await readdir(path.join(dist, 'assets'))).find((f) => /^ResultsPage-.*\.js$/.test(f));
if (!resultsChunk) {
  throw new Error('prerender: could not find the ResultsPage chunk in dist/assets');
}
const viewPreloads = `(function () {
      var search = location.search;
      var view = (search.match(/[?&]view=(\\w+)/) || [])[1];
      var urls =
        view === 'registration' ? ['/api/voter-registration']
        : view === 'turnout' ? ['/api/voter-turnout']
        : ['/api/election-results', '/api/election-results?part=info'];
      if ((view === 'turnout' || view === 'registration') && /[?&]by=district(&|$)/.test(search)) urls.push('/election/districts.json');
      urls.forEach(function (href) {
        var link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'fetch';
        link.href = href;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      });
    })();`;
const resultsHead = [
  `<link rel="modulepreload" href="/assets/${resultsChunk}">`,
  '<link rel="preload" as="fetch" href="/election/counties.json" crossorigin>',
  `<script>${viewPreloads}</script>`,
].join('\n    ');

const pages = [
  { route: '/', file: 'index.html', head: '' },
  { route: '/results', file: 'results.html', head: resultsHead },
];

for (const { route, file, head } of pages) {
  const appHtml = await render(route);
  // data-path tells index.html's inline script which route this markup belongs to
  const html = template
    .replace(marker, `<div id="root" data-path="${route}">${appHtml}</div>`)
    .replace('</head>', head ? `    ${head}\n</head>` : '</head>');
  // Fail the build if a bootstrap/preload script would be blocked by the deployed CSP.
  for (const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    if (!match[1]) continue;
    const hash = createHash('sha256').update(match[1]).digest('base64');
    if (!csp?.includes(`'sha256-${hash}'`)) throw new Error(`CSP does not allow an inline script in ${file}`);
  }
  await writeFile(path.join(dist, file), html);
  console.log(`prerender: injected ${(appHtml.length / 1024).toFixed(1)} KB of ${route} HTML into ${file}`);
}

await rm(ssrDir, { recursive: true, force: true });
