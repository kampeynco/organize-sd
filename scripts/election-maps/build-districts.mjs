// Build the legislative district map the voter registration view draws, written to public/election/districts.json.
//
// The boundaries come from the Secretary of State's own results map (the same file its district map loads), so
// they match the districts its registration counts use: 35 Senate districts, with 26 and 28 split into A and B
// for the State House. The shapes are projected and scaled the same way as the county map (counties.json), so
// the page draws plain SVG paths with no mapping library.
//
// Run: npm run build:districts   (re-run after redistricting)
import mapshaper from 'mapshaper';
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cacheDir = path.join(root, '.cache', 'election-maps');
const outFile = path.join(root, 'public', 'election', 'districts.json');

const DISTRICTS_URL = 'https://sdresws.azurewebsites.us/GeoJSON/LegDistricts.json';
// Albers equal-area centered on South Dakota, as in the county map
const PROJECTION = '+proj=aea +lat_1=43 +lat_2=45.5 +lat_0=44.2 +lon_0=-100.25 +datum=NAD83 +units=m';
const MAP_WIDTH = 1000;

async function cached(name, url) {
  const file = path.join(cacheDir, name);
  try {
    await access(file);
  } catch {
    console.log(`downloading ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} returned ${res.status}`);
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
  }
  return readFile(file, 'utf8');
}

/** Scale projected coordinates into a viewBox `width` wide and write each ring as SVG path data */
function toSvg(features, width, pad = 8) {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  const rings = (geom) => (geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates);
  for (const f of features)
    for (const poly of rings(f.geometry))
      for (const ring of poly)
        for (const [x, y] of ring) {
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
  const k = (width - pad * 2) / (x1 - x0);
  const height = Math.ceil((y1 - y0) * k + pad * 2);
  const px = (x) => Math.round(((x - x0) * k + pad) * 10) / 10;
  // Projected y grows northward; SVG y grows downward
  const py = (y) => Math.round(((y1 - y) * k + pad) * 10) / 10;
  const pathOf = (geom) =>
    rings(geom)
      .map((poly) => poly.map((ring) => 'M' + ring.slice(0, -1).map(([x, y]) => `${px(x)} ${py(y)}`).join(' ') + 'Z').join(''))
      .join('');
  return { viewBox: `0 0 ${width} ${height}`, pathOf };
}

await mkdir(cacheDir, { recursive: true });
const source = await cached('sos-leg-districts.json', DISTRICTS_URL);

// Small districts in Sioux Falls and Rapid City are a few kilometers across, so keep detail to ~100 m
const out = await mapshaper.applyCommands(
  `-i in.json -proj ${JSON.stringify(PROJECTION)} init=wgs84 -simplify interval=100 keep-shapes -clean -o out.json format=geojson`,
  { 'in.json': source }
);
const features = JSON.parse(out['out.json']).features;

const svg = toSvg(features, MAP_WIDTH);
const districts = features
  .map((f) => {
    // "1" .. "35", with "26A", "26B", "28A", "28B"
    const id = String(f.properties.DISTRICT).trim().toUpperCase();
    return { id, name: `District ${id}`, d: svg.pathOf(f.geometry) };
  })
  .sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));

if (districts.length !== 37) throw new Error(`expected 37 districts, got ${districts.length}`);
await writeFile(outFile, JSON.stringify({ viewBox: svg.viewBox, districts }));
console.log(`wrote ${districts.length} districts (${((await readFile(outFile)).length / 1024).toFixed(1)} KB) to ${outFile}`);
