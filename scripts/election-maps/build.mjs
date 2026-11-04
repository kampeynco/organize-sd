// Build the map geometry the /results page draws, written to public/election/.
//
// The Secretary of State reports results by its own precinct names but publishes no precinct boundaries.
// County outlines and most precincts come from the 2020 Census voting districts (VTDs). Where a county or city
// publishes its current precincts (LOCAL_SOURCES), those replace the Census ones. Each SOS precinct is matched to
// boundaries by name and number, and overrides.json records the calls the matcher can't make. Precincts without a
// reliable boundary stay off the map and still appear in the results table.
//
// Shapes are projected and scaled here, so the page draws plain SVG paths with no mapping library.
//
// Run: npm run build:election-maps   (re-run when the SOS changes its precincts; prints a match report)
import mapshaper from 'mapshaper';
import { mkdir, readFile, writeFile, rm, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const cacheDir = path.join(root, '.cache', 'election-maps');
const outDir = path.join(root, 'public', 'election');

const SOS_SITE = 'https://electionresults.sd.gov';
const SOS_API = 'https://sdresws.azurewebsites.us/ResultsAjax.svc';
const SOS_COUNTIES_URL = 'https://sdresws.azurewebsites.us/GeoJSON/sd-geom-only-wgs84.json';
const VTD_URL = 'https://www2.census.gov/geo/tiger/TIGER2020PL/LAYER/VTD/2020/tl_2020_46_vtd20.zip';

/**
 * Counties and cities that publish their current precincts. A `wholeCounty` source draws every precinct in that
 * county, so the Census file isn't used there; the others fill in what they cover and the Census file does the rest.
 * Lincoln County publishes its precincts too (gis.lincolncountysd.gov, Pro29/Voting), but its server only answers
 * browsers that pass a Cloudflare check.
 */
const LOCAL_SOURCES = [
  {
    name: 'minnehaha',
    url:
      'https://gis.minnehahacounty.gov/minnemap/rest/services/Election/MC_Precincts/MapServer/0/query' +
      '?where=1%3D1&outFields=PRECINCTID&outSR=4326&f=geojson',
    wholeCounty: '01',
    precinct: (p) => p.PRECINCTID,
  },
  {
    name: 'pennington',
    url:
      'https://gis.rcgov.org/server/rest/services/AGOL/Voting/MapServer/13/query' +
      '?where=1%3D1&outFields=Precinct&outSR=4326&f=geojson',
    wholeCounty: '02',
    precinct: (p) => p.Precinct,
  },
  // Only the Lincoln County part: Minnehaha's precincts above include the rest of the city
  {
    name: 'sioux-falls',
    url:
      'https://services.arcgis.com/YpECgwASS4iMvgsA/ArcGIS/rest/services/Runoff_Precincts/FeatureServer/0/query' +
      '?where=1%3D1&outFields=PRECINCT,COUNTY&outSR=4326&f=geojson',
    county: (p) => (p.COUNTY === 'LINCOLN' ? '44' : null),
    precinct: (p) => p.PRECINCT,
    // The SOS names them "Sioux Falls 1-11"
    words: ['sioux', 'falls'],
  },
];

// Albers equal-area centered on South Dakota, so the state sits level instead of tilted
const PROJECTION = '+proj=aea +lat_1=43 +lat_2=45.5 +lat_0=44.2 +lon_0=-100.25 +datum=NAD83 +units=m';
const MAP_WIDTH = 1000;
// SOS county records still carry Shannon County's FIPS code; the Census renamed it Oglala Lakota (102) in 2015
const FIPS_FIXES = { '113': '102' };

const overrides = JSON.parse(await readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), 'overrides.json'), 'utf8'));

/* ─── Sources ─── */

async function cached(name, url) {
  const file = path.join(cacheDir, name);
  try {
    await access(file);
  } catch {
    console.log(`downloading ${url}`);
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (organizesd.org results map build)' } });
    if (!res.ok) throw new Error(`${url} returned ${res.status}`);
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
  }
  return file;
}

async function sosJson(query) {
  const res = await fetch(`${SOS_API}/GetMapData?${query}`);
  if (!res.ok) throw new Error(`SOS GetMapData ${query} returned ${res.status}`);
  return (await res.json()).d ?? [];
}

/** Every county's precinct list, read from the first statewide race (every voter in the state sees it) */
async function fetchSosPrecincts(counties) {
  const html = await (await fetch(`${SOS_SITE}/resultsSW.aspx?type=SWR&map=CTY`)).text();
  const first = html.match(/CreateMap\('SWR', '(\d+)', '(\d+)'/);
  if (!first) throw new Error('could not find a statewide race on the SOS results page');
  const [, raceId, osn] = first;
  const lists = await Promise.all(
    counties.map(async (c) => {
      const rows = await sosJson(`type=SWR&category=PREC&raceID=${raceId}&osn=${osn}&county=${c.id}&party=0`);
      const seen = new Map();
      for (const r of rows) seen.set(r.StatePrecinctID, r.PrecinctName.trim());
      return [c.id, [...seen].map(([id, name]) => ({ id, name }))];
    })
  );
  return Object.fromEntries(lists);
}

/* ─── Name matching ─── */

const NUMBER_WORDS = { one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10', first: '1', second: '2', third: '3' };
// Standalone abbreviations only: "E 2nd" means East, but the E in "Precinct-E1" is part of a code
const ABBREVIATIONS = { n: 'north', s: 'south', e: 'east', w: 'west', ne: 'northeast', nw: 'northwest', se: 'southeast', sw: 'southwest', st: 'saint' };
const NOISE = new Set(['vtd', 'precinct', 'pct', 'voting', 'district', 'consolidated', 'city', 'town', 'village', 'ward', 'the', 'of', 'and', 'county']);

/** Split a precinct name into a code ("6A" -> 6,a; "1-4" -> 1,4) and the words around it */
function parseName(raw) {
  const s = raw
    .toLowerCase()
    .replace(/(\d+)(st|nd|rd|th)\b/g, '$1')
    // "S 1/2 of Mitchell township" describes an area, not a precinct number
    .replace(/\b1\/2\b/g, ' ')
    // Minnehaha writes precinct 1-4 as "0104"
    .replace(/\b0(\d)(\d\d)\b/g, '$1 $2');
  const code = [];
  const words = [];
  for (const token of s.split(/[^a-z0-9]+/).filter(Boolean)) {
    if (ABBREVIATIONS[token]) { words.push(ABBREVIATIONS[token]); continue; }
    if (NUMBER_WORDS[token]) { code.push(NUMBER_WORDS[token]); continue; }
    for (const run of token.match(/[a-z]+|\d+/g)) {
      if (/^\d+$/.test(run)) code.push(String(Number(run)));
      else if (run.length <= 2 && !NOISE.has(run)) code.push(run);
      else if (!NOISE.has(run)) words.push(run);
    }
  }
  return { code: code.join('.'), digits: code.filter((t) => /\d/.test(t)).join('.'), words };
}

/**
 * How well two parsed names agree, lower is better (0 = no match):
 * 1 same code and words, 2 same code with compatible words, 3 same words where one side has no code,
 * 4 same number where one side adds letters (Pennington's "Precinct 1-1" is the Census "RC 1-1")
 */
function matchLevel(a, b) {
  const aw = a.words.join(' ');
  const sameSet = (x, y) => x.every((w) => y.includes(w)) && y.every((w) => x.includes(w));
  const sameWords = sameSet(a.words, b.words) || a.words.join('') === b.words.join('');
  const compatible = !a.words.length || !b.words.length || a.words.some((w) => b.words.includes(w));
  if (a.code && a.code === b.code && sameWords) return 1;
  if (a.code && a.code === b.code && compatible) return 2;
  if (aw && sameWords && (!a.code || !b.code)) return 3;
  if (a.digits && a.digits === b.digits && compatible && (a.code === a.digits || b.code === b.digits)) return 4;
  return 0;
}

/** "Precinct-06 (Precinct-07, Precinct-08)" is one reporting unit made of three precincts */
function sosComponents(name) {
  const m = name.match(/^(.*?)\s*\((.*)\)\s*$/);
  return (m ? [m[1], ...m[2].split(',')] : [name]).map((n) => parseName(n.trim()));
}

/** Census names like "Huron W01 (part of precinct 2)" belong to the parent precinct */
function vtdNames(name) {
  const clean = name.replace(/^\s*vtd\s*[-:]?\s*/i, '');
  const part = clean.match(/\(?\s*part of\s+([^)]*)\)?/i);
  const own = parseName(part ? clean.replace(part[0], ' ') : clean);
  return { own, parent: part ? parseName(part[1]) : null };
}

function bestMatch(target, sosPrecincts) {
  let best = 0;
  let hits = [];
  for (const p of sosPrecincts) {
    for (const comp of p.components) {
      const level = matchLevel(comp, target);
      if (!level) continue;
      if (!best || level < best) { best = level; hits = [p.id]; }
      else if (level === best && !hits.includes(p.id)) hits.push(p.id);
    }
  }
  return { level: best, hits };
}

/** SOS precinct id -> VTD GEOIDs for one county, plus notes for the report */
function matchCounty(county, sosPrecincts, vtds) {
  const assigned = {};
  const notes = [];
  const manual = overrides.manual[county.id] ?? {};
  const taken = new Set(Object.values(manual).flat());
  for (const [pid, geoids] of Object.entries(manual)) assigned[pid] = [...geoids];

  const open = sosPrecincts.filter((p) => !assigned[p.id] && !overrides.unmapped[`${county.id}:${p.id}`]);
  for (const v of vtds) {
    if (taken.has(v.geoid) || overrides.ignoreVtds[v.geoid]) continue;
    const { own, parent } = vtdNames(v.name);
    let m = bestMatch(own, open);
    // A ward is matched on its own name only when the name is unambiguous (letters in the code, like "A1");
    // otherwise it reports with the precinct it was part of in 2020
    if (parent && !(m.level === 1 || (m.level === 2 && /[a-z]/.test(own.code)))) m = bestMatch(parent, open);
    if (!m.level) continue;
    if (m.hits.length > 1) { notes.push(`ambiguous: ${v.name} -> ${m.hits.join(', ')}`); continue; }
    (assigned[m.hits[0]] ??= []).push(v.geoid);
  }
  return { assigned, notes };
}

/* ─── Geometry ─── */

async function run(commands, inputs) {
  return mapshaper.applyCommands(commands, inputs);
}

function featureCollection(features) {
  return { type: 'FeatureCollection', features };
}

/** How far north tilts away from straight up at a longitude, in radians (Albers meridians converge on the pole) */
function meridianTilt(lon) {
  const rad = Math.PI / 180;
  const cone = (Math.sin(43 * rad) + Math.sin(45.5 * rad)) / 2;
  return cone * (lon - -100.25) * rad;
}

/**
 * Scale projected coordinates into a viewBox `width` wide and write each ring as SVG path data.
 * `tilt` turns the shapes so north points straight up at that spot (see meridianTilt).
 */
function toSvg(features, width, pad = 8, tilt = 0) {
  const [cos, sin] = [Math.cos(tilt), Math.sin(tilt)];
  const turn = ([x, y]) => [x * cos + y * sin, y * cos - x * sin];
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  const eachPoint = (geom, fn) => {
    const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
    for (const poly of polys) for (const ring of poly) for (const pt of ring) fn(turn(pt));
  };
  for (const f of features) eachPoint(f.geometry, ([x, y]) => {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  });
  const k = (width - pad * 2) / (x1 - x0);
  const height = Math.ceil((y1 - y0) * k + pad * 2);
  const px = (x) => Math.round(((x - x0) * k + pad) * 10) / 10;
  // Projected y grows northward; SVG y grows downward
  const py = (y) => Math.round(((y1 - y) * k + pad) * 10) / 10;
  const point = (pt) => {
    const [x, y] = turn(pt);
    return `${px(x)} ${py(y)}`;
  };
  const pathOf = (geom) => {
    const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
    return polys.map((poly) => poly.map((ring) => 'M' + ring.slice(0, -1).map(point).join(' ') + 'Z').join('')).join('');
  };
  return { viewBox: `0 0 ${width} ${height}`, pathOf, px, py };
}

/* ─── Build ─── */

await mkdir(cacheDir, { recursive: true });
const [vtdZip, sosCountiesFile, ...localFiles] = await Promise.all([
  cached('tl_2020_46_vtd20.zip', VTD_URL),
  cached('sos-counties.json', SOS_COUNTIES_URL),
  ...LOCAL_SOURCES.map((s) => cached(`${s.name}-precincts.json`, s.url)),
]);

const counties = JSON.parse(await readFile(sosCountiesFile, 'utf8')).features
  .map(({ properties: p }) => ({ id: p.CountyID, name: p.CountyName, fips: FIPS_FIXES[p.FipsCode] ?? p.FipsCode }))
  .sort((a, b) => a.name.localeCompare(b.name));
const byFips = Object.fromEntries(counties.map((c) => [c.fips, c]));

console.log('reading SOS precinct lists');
const sosPrecincts = await fetchSosPrecincts(counties);

// Census VTDs, projected once; simplified per output below
const vtdOut = await run(`-i ${vtdZip} -proj ${JSON.stringify(PROJECTION)} -o vtd.json format=geojson`);
const vtdFeatures = JSON.parse(vtdOut['vtd.json']).features;

// Local precincts, each tagged with its county and the precinct name the source uses ("1-11", "VP-01")
const localFeatures = [];
for (const [i, source] of LOCAL_SOURCES.entries()) {
  const out = await run(`-i in.json -proj ${JSON.stringify(PROJECTION)} init=wgs84 -o out.json format=geojson`, {
    'in.json': await readFile(localFiles[i], 'utf8'),
  });
  for (const f of JSON.parse(out['out.json']).features) {
    const county = source.wholeCounty ?? source.county(f.properties);
    if (county && f.geometry) localFeatures.push({ source, county, precinct: source.precinct(f.properties).trim(), geometry: f.geometry });
  }
}

const report = [];
const precinctFeatures = [];
const crosswalk = {};

for (const county of counties) {
  const list = sosPrecincts[county.id];
  const voteCenters = list.every((p) => p.id.startsWith('C'));
  const entry = { county, total: list.length, mapped: 0, voteCenters, notes: [] };
  report.push(entry);
  crosswalk[county.id] = {};
  if (voteCenters || overrides.skip[county.id]) continue;

  const mappable = list
    .filter((p) => !p.id.startsWith('C'))
    .map((p) => ({ ...p, components: sosComponents(p.name) }));

  // Local precincts first: they have current boundaries. Matched on the code alone, plus any words the source leaves off.
  const localMatched = new Set();
  for (const f of localFeatures.filter((f) => f.county === county.id)) {
    const key = parseName(f.precinct);
    const words = f.source.words ?? [];
    const p = key.code && mappable.find((p) => p.components.some((c) => c.code === key.code && c.words.every((w) => words.includes(w))));
    if (!p) { entry.notes.push(`${f.source.name} precinct ${f.precinct} has no SOS match`); continue; }
    localMatched.add(p.id);
    crosswalk[county.id][p.id] = [`${f.source.name}:${f.precinct}`];
    precinctFeatures.push({ type: 'Feature', properties: { county: county.id, pid: p.id, source: 'local' }, geometry: f.geometry });
  }

  const wholeCounty = LOCAL_SOURCES.some((s) => s.wholeCounty === county.id);
  const vtds = wholeCounty
    ? []
    : vtdFeatures
        .filter((f) => f.properties.COUNTYFP20 === county.fips)
        .map((f) => ({ geoid: f.properties.GEOID20, name: f.properties.NAME20, feature: f }));
  const { assigned, notes } = matchCounty(county, mappable.filter((p) => !localMatched.has(p.id)), vtds);
  entry.notes.push(...notes);
  for (const [pid, geoids] of Object.entries(assigned)) {
    crosswalk[county.id][pid] = geoids;
    for (const g of geoids) {
      const v = vtds.find((v) => v.geoid === g);
      if (!v) throw new Error(`overrides.json: ${g} is not a VTD in ${county.name} County`);
      precinctFeatures.push({ type: 'Feature', properties: { county: county.id, pid, source: 'vtd' }, geometry: v.feature.geometry });
    }
  }
  entry.mapped = Object.keys(crosswalk[county.id]).length;
  entry.unmatched = mappable.filter((p) => !crosswalk[county.id][p.id]).map((p) => `${p.id} ${p.name}`);
  entry.unusedVtds = vtds.filter((v) => !Object.values(assigned).flat().includes(v.geoid)).map((v) => `${v.geoid} ${v.name}`);
}

// County outlines: Census VTDs dissolved by county, so precinct edges line up with them exactly
const countyGeo = JSON.parse(
  (await run(
    `-i vtd.json -dissolve COUNTYFP20 -simplify interval=400 keep-shapes -each 'lx=this.innerX, ly=this.innerY' -o out.json format=geojson`,
    { 'vtd.json': featureCollection(vtdFeatures) }
  ))['out.json']
).features;

const state = toSvg(countyGeo, MAP_WIDTH);
const countyMap = {
  viewBox: state.viewBox,
  counties: countyGeo
    .map((f) => {
      const c = byFips[f.properties.COUNTYFP20];
      return {
        id: c.id,
        name: c.name,
        d: state.pathOf(f.geometry),
        label: [state.px(f.properties.lx), state.py(f.properties.ly)],
        precinctMap: Object.keys(crosswalk[c.id]).length > 0,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name)),
};

// Precincts: dissolve each SOS precinct's pieces, clip Census pieces where a local precinct now sits
const localLayer = featureCollection(precinctFeatures.filter((f) => f.properties.source === 'local'));
const vtdLayer = featureCollection(precinctFeatures.filter((f) => f.properties.source === 'vtd'));
const detailedOutlines = JSON.parse(
  (await run(`-i vtd.json -dissolve COUNTYFP20 -simplify interval=60 keep-shapes -o out.json format=geojson`, {
    'vtd.json': featureCollection(vtdFeatures),
  }))['out.json']
).features;
const precinctGeo = JSON.parse(
  (await run(
    `-i vtd.json local.json combine-files -erase local target=vtd -merge-layers target=vtd,local force name=all ` +
      `-dissolve2 county,pid -simplify interval=60 keep-shapes -o out.json format=geojson`,
    { 'vtd.json': vtdLayer, 'local.json': localLayer }
  ))['out.json']
).features;

await rm(outDir, { recursive: true, force: true });
await mkdir(path.join(outDir, 'precincts'), { recursive: true });
await writeFile(path.join(outDir, 'counties.json'), JSON.stringify(countyMap));

for (const county of counties) {
  const shapes = precinctGeo.filter((f) => f.properties.county === county.id && f.geometry);
  if (!shapes.length) continue;
  const outline = detailedOutlines.find((f) => f.properties.COUNTYFP20 === county.fips);
  const lons = vtdFeatures.filter((f) => f.properties.COUNTYFP20 === county.fips).map((f) => Number(f.properties.INTPTLON20));
  const view = toSvg([outline], MAP_WIDTH, 12, meridianTilt(lons.reduce((a, b) => a + b, 0) / lons.length));
  await writeFile(
    path.join(outDir, 'precincts', `${county.id}.json`),
    JSON.stringify({
      viewBox: view.viewBox,
      outline: view.pathOf(outline.geometry),
      precincts: shapes.map((f) => ({ id: f.properties.pid, d: view.pathOf(f.geometry) })),
    })
  );
}

/* ─── Report ─── */

let mappedTotal = 0;
let mappableTotal = 0;
for (const e of report) {
  const why = e.voteCenters ? 'vote centers' : overrides.skip[e.county.id] ? `skipped: ${overrides.skip[e.county.id]}` : '';
  const mappable = e.voteCenters ? 0 : e.total;
  mappedTotal += e.mapped;
  mappableTotal += mappable;
  console.log(`${e.county.id} ${e.county.name.padEnd(14)} ${String(e.mapped).padStart(3)}/${String(e.total).padEnd(3)} ${why}`);
  if (process.argv.includes('--verbose')) {
    for (const n of e.notes) console.log(`     note: ${n}`);
    for (const u of e.unmatched ?? []) console.log(`     no boundary: ${u}`);
    for (const u of e.unusedVtds ?? []) console.log(`     unused VTD: ${u}`);
    for (const [pid, g] of Object.entries(crosswalk[e.county.id])) {
      const name = sosPrecincts[e.county.id].find((p) => p.id === pid).name;
      console.log(`     ${pid} ${name} <- ${g.map((id) => vtdFeatures.find((f) => f.properties.GEOID20 === id)?.properties.NAME20 ?? id).join(' + ')}`);
    }
  }
}
console.log(`mapped ${mappedTotal} of ${mappableTotal} precincts outside vote-center counties`);
