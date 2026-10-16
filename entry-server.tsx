import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './App';

/** Render the home page to static HTML at build time (see scripts/prerender.js) */
export function render(): string {
  return renderToString(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
