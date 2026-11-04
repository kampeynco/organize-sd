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

`/results` has a toggle between three views of the Secretary of State's data:

- **Election results**: unofficial 2026 results for statewide offices and ballot questions on a county map, with
  a precinct map for each county where we have boundaries.
- **Voter turnout**: 2026 ballots cast as a share of active voters, by county or legislative district.
- **Voter registration**: active voters by party, by county or legislative district, mapped as the largest party
  or any one party's share.

Whatever is on screen is in the address, so any view can be shared:

| Address | Shows |
| --- | --- |
| `/results?race=14896&county=49` | Results for one race, zoomed into one county's precincts |
| `/results?view=turnout&by=district&area=13` | Turnout by legislative district, District 13 picked |
| `/results?view=registration&show=DEM&by=district&area=15` | Democrats' share by district, District 15 picked |

`show` is `REP`, `DEM`, `IND`, `NPA`, `LIB` or `OTH`. Turnout and registration share `by` and `area`.

### Where the data comes from

The page reads a saved copy of the SOS data in the Neon database (`DATABASE_URL`), in the `sos` schema
(`scripts/sos/schema.sql`). The copy keeps the page up after the SOS results site moves on to the next election,
and keeps our visitors off the state's servers.

- `api/election-results.ts`, `api/voter-turnout.ts` and `api/voter-registration.ts` serve the latest saved
  election and the latest day's registration, in the shapes `lib/` describes. Vercel's CDN keeps each response
  for five minutes, and after that serves its old copy while it fetches a new one.
- A Vercel cron (`vercel.json`) calls `api/save-sos.ts` every day at 12:00 UTC to copy the SOS data again
  (`api/_sos-save.ts`). It needs a `CRON_SECRET` environment variable in the Vercel project: Vercel sends it with
  the cron's request, and the endpoint turns away any request without it. `npm run save:sos` makes the same copy
  now, using `DATABASE_URL` from `.env.local`.
- Each copy replaces the election's results and turnout, but only while the SOS results site still shows that
  election (its title names `ELECTION_DATE`); after that the saved copy keeps it. Registration is saved every
  time, one copy per day, so it builds a history. To follow a later election, change `ELECTION_ID` and
  `ELECTION_DATE` in `api/_sos-save.ts`.

None of the SOS data has a documented API. `api/_sos-live.ts` reads it:

- Results come from the JSON service behind electionresults.sd.gov's maps (`GetMapData`), one request per race
  type and level (statewide, county, precinct) with race 0 for all races. The SOS results page itself is slow at
  times, so it is read only for the election title and banner.
- Registration comes from the Voter Information Portal pages `VoterRegistrationsByCounty.aspx` and
  `VoterRegistrationsByDistrict.aspx` on vip.sdsos.gov. Each carries its counts as JSON in a hidden field
  (`hidCountyTotals`, `hidDistrictTotals`), one row per area, party and status. That is read rather than the
  visible table, which is inconsistent about voters with a blank party code. Counting blanks as Other makes the
  county rows add up exactly to the SOS statewide totals page; the district rows add up to a slightly different
  total, and the page shows each as published.
- County turnout comes from the data service (`GetVoterTurnoutData`). The SOS doesn't report turnout by
  legislative district, so it is built from ballots per precinct (only in the HTML of
  `VoterTurnoutDetails.aspx?map=PREC`), each precinct's district (from the legislative races' precinct results)
  and active voters per district (from the VIP district page). About 13% of ballots are cast where voters from
  more than one district vote together: the vote centers of the 11 vote-center counties, absentee precincts and
  a few split precincts. Those are divided among the districts by the votes cast in each district's legislative
  races there, scaled by each district's ballots-per-vote rate in the precincts it has to itself. Districts with
  at least a tenth of their ballots divided this way are marked "estimate".

If the daily copy fails (the cron's log in Vercel, or `npm run save:sos`, says which part), check that the SOS
pages still have the hidden fields and markup described above. A failed copy leaves the last good one in place.

### Building the page

- `npm run build` prerenders the results view into `dist/results.html` (served at `/results`), so its layout
  paints at once. A script in its head starts the code and the open view's first data downloading with the
  HTML (see `scripts/prerender.js`). On `?view=turnout` or `?view=registration` the prerendered results markup
  is cleared before it paints (see `index.html`).
- `public/election/` holds the map shapes. `npm run build:election-maps` builds the county and precinct maps;
  re-run it if the SOS changes a county's precincts. It prints which precincts it matched to a boundary, and
  calls the matcher can't make (redrawn counties, renamed precincts) go in
  `scripts/election-maps/overrides.json`. `npm run build:districts` builds `districts.json` from the SOS's own
  legislative district map; re-run it after redistricting.

`npm run dev` runs the functions in `api/` too (see `devApi` in `vite.config.ts`). Use it instead of `vercel dev`,
which rewrites every non-API path to `index.html`, including Vite's own modules. The results page and the signup
function need `DATABASE_URL` in the dev server's environment, and signups go to whatever database it points at.
To use the one in `.env.local`, start the dev server with `node --env-file=.env.local node_modules/vite/bin/vite.js`.
