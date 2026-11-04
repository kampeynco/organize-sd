import React from 'react';
import { prerender } from 'react-dom/static';
import App from './App';

/** Render a page to static HTML at build time (see scripts/prerender.js), waiting for lazy-loaded pages */
export async function render(path: string): Promise<string> {
  const { prelude } = await prerender(
    <React.StrictMode>
      <App path={path} />
    </React.StrictMode>,
    // Keep each page's markup in place. Otherwise React moves a large lazy page to the end of the HTML
    // and swaps it in with a script, which can hold back its first paint.
    { progressiveChunkSize: Infinity }
  );
  return new Response(prelude).text();
}
