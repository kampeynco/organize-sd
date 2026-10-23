<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1MfDoDVO-y4xeG0N6wKnG4sxc7ApHJcyq

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Election results page

`/results` shows the Secretary of State's unofficial Election Day results on a county map, with a precinct map
for each county where we have boundaries. It refreshes every minute.

- `api/election-results.ts` relays results from electionresults.sd.gov (the race list comes from the page HTML,
  the counts from the JSON service its maps use) and caches them for 30 seconds at the CDN.
- `public/election/` holds the map shapes, built by `npm run build:election-maps`. Re-run it if the SOS changes
  a county's precincts; it prints which precincts it matched to a boundary. Calls the matcher can't make
  (redrawn counties, renamed precincts) go in `scripts/election-maps/overrides.json`.

`npm run dev` runs the functions in `api/` too (see `devApi` in `vite.config.ts`). Use it instead of `vercel dev`,
which rewrites every non-API path to `index.html`, including Vite's own modules. The signup function needs
`DATABASE_URL` in your shell environment and writes to whatever database it points at.
