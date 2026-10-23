import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { faArrowLeft, faChevronDown, faCircleInfo, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import {
  fetchCountyMap,
  fetchCountyResults,
  fetchPrecinctMap,
  fetchPrecinctResults,
  fetchSummary,
  type CountyMap,
  type CountyResult,
  type ElectionSummary,
  type PrecinctMap,
  type PrecinctResult,
  type Race,
} from '../lib/electionResults';
import {
  ResultsLegend,
  ResultsMap,
  formatShare,
  formatVotes,
  raceColors,
  standing,
  type MapResult,
} from './ResultsMap';

// Election night counts move every few minutes; the API caches for 30 seconds
const REFRESH_MS = 60_000;
// After a failed request, try again sooner than the next scheduled refresh
const RETRY_MS = 10_000;
const SOS_RESULTS_URL = 'https://electionresults.sd.gov/';

type County = CountyMap['counties'][number];

const readParams = () => {
  const p = new URLSearchParams(window.location.search);
  return { race: p.get('race'), county: p.get('county') };
};

/** Results for one race, tagged with the race (and county) they belong to so a slow response never paints another race */
interface Loaded<T> {
  key: string;
  data: T;
}

export const ResultsPage: React.FC = () => {
  const [summary, setSummary] = useState<ElectionSummary | null>(null);
  const [summaryError, setSummaryError] = useState('');
  const [countyMap, setCountyMap] = useState<CountyMap | null>(null);
  const [raceId, setRaceId] = useState<string | null>(() => readParams().race);
  const [countyId, setCountyId] = useState<string | null>(() => readParams().county);
  const [counties, setCounties] = useState<Loaded<CountyResult[]> | null>(null);
  const [precincts, setPrecincts] = useState<Loaded<PrecinctResult[]> | null>(null);
  const [precinctMap, setPrecinctMap] = useState<Loaded<PrecinctMap> | null>(null);
  const [detailError, setDetailError] = useState('');
  const [tick, setTick] = useState(0);

  const race = summary?.races.find((r) => r.id === raceId) ?? summary?.races[0] ?? null;
  const raceKey = race ? `${race.type}:${race.id}` : '';
  // An unknown county in the address falls back to the statewide map
  const county = countyMap?.counties.find((c) => c.id === countyId) ?? null;
  const precinctKey = `${raceKey}:${county?.id}`;

  useEffect(() => {
    const previous = document.title;
    document.title = 'South Dakota Election Results | Organize SD';
    return () => { document.title = previous; };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') setTick((t) => t + 1);
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!summaryError && !detailError) return;
    const retry = setTimeout(() => setTick((t) => t + 1), RETRY_MS);
    return () => clearTimeout(retry);
  }, [summaryError, detailError, tick]);

  useEffect(() => {
    if (countyMap) return;
    fetchCountyMap().then(setCountyMap).catch((e: Error) => setSummaryError(e.message));
  }, [countyMap, tick]);

  useEffect(() => {
    let live = true;
    fetchSummary()
      .then((s) => { if (live) { setSummary(s); setSummaryError(''); } })
      .catch((e: Error) => { if (live) setSummaryError(e.message); });
    return () => { live = false; };
  }, [tick]);

  // The race object is replaced on every refresh, so these effects follow its key instead
  useEffect(() => {
    if (!race) return;
    let live = true;
    fetchCountyResults(race)
      .then((r) => { if (live) { setCounties({ key: raceKey, data: r.counties }); setDetailError(''); } })
      .catch((e: Error) => { if (live) setDetailError(e.message); });
    return () => { live = false; };
  }, [raceKey, tick]);

  useEffect(() => {
    if (!race || !county) return;
    let live = true;
    fetchPrecinctResults(race, county.id)
      .then((r) => { if (live) { setPrecincts({ key: precinctKey, data: r.precincts }); setDetailError(''); } })
      .catch((e: Error) => { if (live) setDetailError(e.message); });
    return () => { live = false; };
  }, [precinctKey, tick]);

  useEffect(() => {
    if (!county?.precinctMap) return;
    let live = true;
    fetchPrecinctMap(county.id)
      .then((m) => { if (live) setPrecinctMap({ key: county.id, data: m }); })
      .catch(() => { /* the precinct table still shows every result */ });
    return () => { live = false; };
  }, [county]);

  // Keep the address shareable: /results?race=14412&county=49
  useEffect(() => {
    if (!race || !countyMap) return;
    const params = new URLSearchParams({ race: race.id });
    if (county) params.set('county', county.id);
    window.history.replaceState(window.history.state, '', `/results?${params}`);
  }, [race?.id, countyMap, county]);

  const colors = useMemo(() => (race ? raceColors(race.candidates) : {}), [race]);
  const countyData = counties?.key === raceKey ? counties.data : null;
  const precinctData = county && precincts?.key === precinctKey ? precincts.data : null;
  const precinctShapes = county && precinctMap?.key === county.id ? precinctMap.data : null;
  // Vote-center counties report by polling place (ids like C740) instead of by precinct
  const voteCenters = !!precinctData?.length && precinctData.every((p) => p.id.startsWith('C'));

  /** Picking a county from the table below brings the map back into view */
  const selectCounty = (id: string | null) => {
    setCountyId(id);
    const map = document.getElementById('results-map');
    if (map && map.getBoundingClientRect().top < 0) map.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-paper">
      <section className="grain relative isolate overflow-hidden bg-brand text-white">
        <div className="container mx-auto px-4 sm:px-5 max-w-7xl pt-32 pb-12 md:pt-40 md:pb-16 grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 lg:gap-12 items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-mint">Election results</p>
            <h1 className="mt-4 font-display font-black uppercase text-5xl sm:text-6xl xl:text-7xl leading-[0.9]">
              South Dakota<br /> results
            </h1>
            <Updated summary={summary} />
            {summary && <Stats summary={summary} />}
          </div>

          <MapCard
            summary={summary}
            race={race}
            onRace={setRaceId}
            colors={colors}
            countyMap={countyMap}
            countyResults={countyData}
            county={county}
            countyPending={!!countyId && !countyMap}
            precinctMap={precinctShapes}
            precinctResults={precinctData}
            voteCenters={voteCenters}
            onSelectCounty={selectCounty}
          />
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-5 max-w-7xl py-10 md:py-14">
        {summaryError && !summary && <ErrorNote message={summaryError} />}
        {summaryError && summary && (
          <p role="status" className="mb-6 text-sm font-semibold text-brand-ink/70">
            Couldn't check for new results just now. These are the last counts we received; we'll keep trying.
          </p>
        )}
        {!summary && !summaryError && <p className="text-brand-ink/60" aria-busy="true">Loading results…</p>}
        {summary && !summary.races.length && (
          <p className="rounded-3xl bg-white p-8 text-lg text-brand-ink/80">
            The Secretary of State hasn't posted results for this election yet.
          </p>
        )}

        {race && (
          <RaceResults
            race={race}
            colors={colors}
            counties={countyData}
            county={county}
            precincts={precinctData}
            precinctMap={precinctShapes}
            voteCenters={voteCenters}
            error={detailError}
            onSelectCounty={selectCounty}
          />
        )}

        <SourceNote />
      </div>
    </div>
  );
};

/* ─── Hero ─── */

const Updated: React.FC<{ summary: ElectionSummary | null }> = ({ summary }) => {
  const testing = !!summary?.message && /test/i.test(summary.message);
  return (
    <div className="mt-5 text-white/85">
      <p className="text-lg md:text-xl">{summary?.title ?? 'Unofficial results'}</p>
      {summary?.updated && (
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/60">
          Unofficial · updated {summary.updated}
          {testing && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-signal px-2.5 py-0.5 text-xs font-bold text-brand-ink">
              <Icon icon={faTriangleExclamation} />
              SOS test data, not real votes
            </span>
          )}
        </p>
      )}
      {summary?.message && !testing && <p className="mt-1 text-sm text-white/60">{summary.message}</p>}
    </div>
  );
};

const fieldClass = 'rounded-xl px-4 py-3 font-semibold';

/**
 * A native select drawn as a box whose label can wrap, so a long office name stays readable on a narrow phone
 * (a select's own text can't wrap, and text under 16px makes iPhones zoom in). The real select sits on top,
 * invisible, so taps, keyboards and screen readers all use it, and its widest option still sets the field's width.
 */
const PickerSelect: React.FC<{
  value: string;
  shown: string;
  disabled: boolean;
  onChange: (value: string) => void;
  children: React.ReactNode;
}> = ({ value, shown, disabled, onChange, children }) => (
  <span className="mt-2 grid">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`peer relative z-10 [grid-area:1/1] w-full min-w-0 cursor-pointer appearance-none pr-10 opacity-0 disabled:cursor-default ${fieldClass}`}
    >
      {children}
    </select>
    <span
      aria-hidden="true"
      className={`[grid-area:1/1] flex items-center justify-between gap-3 bg-white text-brand-ink ring-2 ring-inset ring-brand-ink/15 peer-hover:ring-brand/40 peer-disabled:opacity-60 peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-signal ${fieldClass}`}
    >
      <span className="min-w-0">{shown}</span>
      <Icon icon={faChevronDown} className="shrink-0 text-xs text-brand-ink/60" />
    </span>
  </span>
);

const Pickers: React.FC<{
  summary: ElectionSummary | null;
  race: Race | null;
  countyMap: CountyMap | null;
  county: County | null;
  onRace: (id: string) => void;
  onCounty: (id: string | null) => void;
}> = ({ summary, race, countyMap, county, onRace, onCounty }) => {
  const races = summary?.races ?? [];
  const groups = [
    { title: 'Statewide races', races: races.filter((r) => r.type === 'SWR') },
    { title: 'Ballot questions', races: races.filter((r) => r.type === 'BQ') },
  ].filter((g) => g.races.length);

  // The office field starts at the width of its longest option ("Commissioner of School and Public Lands") and the
  // county field at its own, so neither cuts off a label; when both don't fit on one line, county moves below
  return (
    <div className="flex flex-wrap gap-4">
      <label className="block min-w-0 flex-[1_1_auto]">
        <span className="text-xs font-bold uppercase tracking-[0.15em] text-brand">Office</span>
        <PickerSelect value={race?.id ?? ''} shown={race?.name ?? 'Loading…'} disabled={!race} onChange={onRace}>
          {!race && <option value="">Loading…</option>}
          {groups.map((g) => (
            <optgroup key={g.title} label={g.title}>
              {g.races.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </optgroup>
          ))}
        </PickerSelect>
      </label>
      <label className="block w-full sm:w-auto sm:flex-none">
        <span className="text-xs font-bold uppercase tracking-[0.15em] text-brand">County</span>
        <PickerSelect
          value={county?.id ?? ''}
          shown={county?.name ?? 'All counties'}
          disabled={!countyMap}
          onChange={(id) => onCounty(id || null)}
        >
          <option value="">All counties</option>
          {countyMap?.counties.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </PickerSelect>
      </label>
    </div>
  );
};

const Stats: React.FC<{ summary: ElectionSummary }> = ({ summary }) => {
  const p = summary.precincts;
  return (
    <dl className="mt-8 grid grid-cols-3 gap-3">
      <Stat label="Precincts" value={`${p.total ? Math.round((p.reporting / p.total) * 100) : 0}%`} detail={`${formatVotes(p.reporting)} of ${formatVotes(p.total)} in`} />
      <Stat label="Ballots cast" value={formatVotes(summary.ballotsCast)} detail={`${formatVotes(summary.activeVoters)} active voters`} />
      <Stat
        label="Turnout"
        value={summary.activeVoters ? formatShare(summary.ballotsCast / summary.activeVoters) : '–'}
        detail="of active voters"
      />
    </dl>
  );
};

const Stat: React.FC<{ label: string; value: string; detail: string }> = ({ label, value, detail }) => (
  <div className="min-w-0 rounded-2xl bg-white/10 ring-1 ring-white/15 p-3 sm:p-4">
    <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/70">{label}</dt>
    <dd className="mt-1 font-display font-black text-3xl sm:text-4xl leading-none">{value}</dd>
    <dd className="mt-1 text-xs sm:text-sm text-white/70">{detail}</dd>
  </div>
);

/* ─── Map card ─── */

const MapCard: React.FC<{
  summary: ElectionSummary | null;
  race: Race | null;
  onRace: (id: string) => void;
  colors: Record<string, string>;
  countyMap: CountyMap | null;
  countyResults: CountyResult[] | null;
  county: County | null;
  /** A county was asked for (from the address) but the county list hasn't loaded yet */
  countyPending: boolean;
  precinctMap: PrecinctMap | null;
  precinctResults: PrecinctResult[] | null;
  voteCenters: boolean;
  onSelectCounty: (id: string | null) => void;
}> = ({ summary, race, onRace, colors, countyMap, countyResults, county, countyPending, precinctMap, precinctResults, voteCenters, onSelectCounty }) => {
  const countyById = useMemo(() => new Map<string, MapResult>((countyResults ?? []).map((c) => [c.id, c])), [countyResults]);
  const precinctById = useMemo(() => new Map<string, MapResult>((precinctResults ?? []).map((p) => [p.id, p])), [precinctResults]);
  const byPrecinct = !!county?.precinctMap;

  let hint = 'Results by county. Hover over a county for details, or click or tap one to see its precincts.';
  if (county && byPrecinct) hint = 'Results by precinct. Hover or tap a precinct for details. Double-click or use + to zoom in, then drag to move around.';
  else if (county && voteCenters) hint = `${county.name} County votes at vote centers, so it reports by voting location and has no precinct map. Its results are below.`;
  else if (county) hint = `We don't have current precinct boundaries for ${county.name} County. Its precinct results are below.`;

  let map: React.ReactNode = <MapPlaceholder ratio={byPrecinct ? '1000 / 700' : '1000 / 640'} />;
  if (race && !countyPending && byPrecinct && precinctMap && precinctResults) {
    map = (
      <ResultsMap
        key={`${race.id}-${county!.id}`}
        viewBox={precinctMap.viewBox}
        areas={precinctMap.precincts}
        outline={precinctMap.outline}
        results={precinctById}
        candidates={race.candidates}
        colors={colors}
        noun="precinct"
        label={`Map of ${race.name} results by precinct in ${county!.name} County. The tables below list the same results.`}
        zoomable
      />
    );
  } else if (race && !countyPending && !byPrecinct && countyMap && countyResults) {
    map = (
      <ResultsMap
        key={race.id}
        viewBox={countyMap.viewBox}
        areas={countyMap.counties}
        results={countyById}
        candidates={race.candidates}
        colors={colors}
        noun="county"
        label={`Map of ${race.name} results by South Dakota county. The tables below list the same results.`}
        onSelect={onSelectCounty}
        highlight={county?.id}
      />
    );
  }

  return (
    <div id="results-map" className="min-w-0 rounded-3xl bg-white p-4 sm:p-6 text-brand-ink shadow-2xl shadow-brand-ink/30 scroll-mt-24">
      {/* The dropdowns name what the map shows, so they stand in for a visible title */}
      <h2 className="sr-only">Results map</h2>
      <Pickers
        summary={summary}
        race={race}
        countyMap={countyMap}
        county={county}
        onRace={onRace}
        onCounty={onSelectCounty}
      />
      <div className="mt-4 flex items-start justify-between gap-3">
        <p className="text-sm text-brand-ink/60">{hint}</p>
        {county && (
          <button
            type="button"
            onClick={() => onSelectCounty(null)}
            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-paper px-4 py-2 text-sm font-bold text-brand-ink hover:bg-paper-dark transition-colors"
          >
            <Icon icon={faArrowLeft} /> Statewide
          </button>
        )}
      </div>
      <div className="mt-4">{map}</div>
      {race && (
        <div className="mt-5">
          <ResultsLegend candidates={race.candidates} colors={colors} showNoBoundary={byPrecinct} />
        </div>
      )}
    </div>
  );
};

/* ─── Results below the hero ─── */

const RaceResults: React.FC<{
  race: Race;
  colors: Record<string, string>;
  counties: CountyResult[] | null;
  county: County | null;
  precincts: PrecinctResult[] | null;
  precinctMap: PrecinctMap | null;
  voteCenters: boolean;
  error: string;
  onSelectCounty: (id: string | null) => void;
}> = ({ race, colors, counties, county, precincts, precinctMap, voteCenters, error, onSelectCounty }) => {
  // Lives here, not in the table, so the choice carries over between the county and precinct tables
  const [display, setDisplay] = useState<Display>('both');
  const countyResult = county ? counties?.find((c) => c.id === county.id) : undefined;
  const mapped = new Set(precinctMap?.precincts.map((p) => p.id));
  const showParty = race.type !== 'BQ';
  const unmapped = county?.precinctMap && precincts && precinctMap && precincts.some((p) => !mapped.has(p.id));

  return (
    <article className="rounded-3xl bg-white p-5 sm:p-8 md:p-10 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand">
        {race.type === 'BQ' ? 'Ballot question' : `Vote for ${race.voteFor}`}
      </p>
      <h2 className="mt-2 font-display font-black uppercase text-4xl md:text-5xl leading-[0.95] text-brand-ink">{race.name}</h2>
      {race.question && <p className="mt-3 max-w-3xl text-brand-ink/75 leading-relaxed">{race.question}</p>}

      <div className={`mt-8 grid gap-10 ${county ? 'lg:grid-cols-2' : ''}`}>
        <section aria-labelledby="statewide-heading">
          <h3 id="statewide-heading" className="text-xs font-bold uppercase tracking-[0.15em] text-brand-ink/60">Statewide</h3>
          <CandidateRows
            candidates={race.candidates}
            votes={Object.fromEntries(race.candidates.map((c) => [c.id, c.votes]))}
            colors={colors}
            showParty={showParty}
          />
          <p className="mt-4 text-sm text-brand-ink/60">
            {formatVotes(race.reporting)} of {formatVotes(race.total)} precincts reporting
            {race.partial > 0 && ` · ${formatVotes(race.partial)} partially`}
          </p>
        </section>
        {county && (
          <section aria-labelledby="county-heading">
            <h3 id="county-heading" className="text-xs font-bold uppercase tracking-[0.15em] text-brand-ink/60">{county.name} County</h3>
            {countyResult ? (
              <>
                <CandidateRows candidates={race.candidates} votes={countyResult.votes} colors={colors} showParty={showParty} />
                <p className="mt-4 text-sm text-brand-ink/60">
                  {countyResult.reporting} of {countyResult.total} precincts reporting
                </p>
              </>
            ) : (
              <p className="mt-6 text-brand-ink/60" aria-busy="true">Loading…</p>
            )}
          </section>
        )}
      </div>

      {error && <div className="mt-8"><ErrorNote message={error} /></div>}

      {county && unmapped && (
        <p className="mt-8 flex items-start gap-3 rounded-2xl bg-paper p-4 text-sm text-brand-ink/80">
          <Icon icon={faCircleInfo} className="mt-0.5 shrink-0 text-brand" />
          Precincts drawn since 2020 and absentee ballot counts have no boundary on the map. They are marked in the table.
        </p>
      )}

      {county ? (
        precincts ? (
          <ResultsTable
            title={`${county.name} County by ${voteCenters ? 'voting location' : 'precinct'}`}
            areaLabel={voteCenters ? 'Voting location' : 'Precinct'}
            rows={precincts.map((p) => ({
              ...p,
              progress: p.reported ? 'Yes' : 'No',
              flag: county.precinctMap && precinctMap && !mapped.has(p.id) ? 'Not on map' : undefined,
            }))}
            progressLabel="Reported"
            race={race}
            colors={colors}
            display={display}
            onDisplay={setDisplay}
          />
        ) : (
          <p className="mt-10 text-brand-ink/60" aria-busy="true">Loading precinct results…</p>
        )
      ) : (
        counties && (
          <ResultsTable
            title="Results by county"
            areaLabel="County"
            rows={counties.map((c) => ({ ...c, progress: `${c.reporting}/${c.total}` }))}
            race={race}
            colors={colors}
            display={display}
            onDisplay={setDisplay}
            onSelect={onSelectCounty}
          />
        )
      )}
    </article>
  );
};

const CandidateRows: React.FC<{
  candidates: Race['candidates'];
  votes: Record<string, number>;
  colors: Record<string, string>;
  showParty: boolean;
}> = ({ candidates, votes, colors, showParty }) => {
  const s = standing(votes, candidates);
  return (
    <ul className="mt-4 space-y-4">
      {candidates.map((c) => {
        const share = s.total ? (votes[c.id] ?? 0) / s.total : 0;
        const leading = s.leader?.id === c.id;
        return (
          <li key={c.id}>
            <div className="flex items-baseline justify-between gap-4">
              <div className="min-w-0">
                <span className="inline-block w-3 h-3 rounded-full mr-2 align-[-1px]" style={{ background: colors[c.id] }} aria-hidden="true"></span>
                <span className={`text-lg text-brand-ink ${leading ? 'font-bold' : 'font-semibold'}`}>{c.name}</span>
                {showParty && <span className="ml-2 text-sm text-brand-ink/60">{c.partyName}</span>}
              </div>
              <div className="shrink-0 text-right tabular-nums">
                <span className={`text-lg text-brand-ink ${leading ? 'font-bold' : 'font-semibold'}`}>{s.total ? formatShare(share) : '–'}</span>
                <span className="ml-3 text-sm text-brand-ink/60">{formatVotes(votes[c.id] ?? 0)}</span>
              </div>
            </div>
            <div className="mt-2 h-2.5 rounded-full bg-brand-ink/[0.07]" aria-hidden="true">
              <div className="h-full rounded-full" style={{ width: `${share * 100}%`, background: colors[c.id] }}></div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

/* ─── Table (the map's accessible twin) ─── */

interface TableRow {
  id: string;
  name: string;
  votes: Record<string, number>;
  progress: string;
  flag?: string;
}

/** "Larry Rhoden and Tony Venhuizen" -> "Rhoden", for narrow column headings */
const shortName = (name: string) => {
  const words = name.split(' and ')[0].split(' ').filter((w) => !/^(jr|sr|ii|iii|iv)\.?$/i.test(w));
  return words[words.length - 1] ?? name;
};

/** What each vote cell shows: the count, the share, or "1,234 (56.7%)" */
type Display = 'votes' | 'share' | 'both';

const DISPLAYS: { id: Display; label: string }[] = [
  { id: 'votes', label: 'Numbers' },
  { id: 'share', label: 'Percentage' },
  { id: 'both', label: 'Both' },
];

const DisplayTabs: React.FC<{ display: Display; onDisplay: (d: Display) => void }> = ({ display, onDisplay }) => {
  const onTabKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = DISPLAYS.findIndex((d) => d.id === display);
    const next = DISPLAYS[(i + (e.key === 'ArrowRight' ? 1 : DISPLAYS.length - 1)) % DISPLAYS.length].id;
    onDisplay(next);
    document.getElementById(`results-view-${next}`)?.focus();
  };

  return (
    <div role="tablist" aria-label="Show results as" className="inline-flex rounded-full bg-paper p-1 gap-1">
      {DISPLAYS.map((d) => {
        const active = d.id === display;
        return (
          <button
            key={d.id}
            id={`results-view-${d.id}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls="results-table"
            tabIndex={active ? 0 : -1}
            onClick={() => onDisplay(d.id)}
            onKeyDown={onTabKey}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              active ? 'bg-brand text-white shadow' : 'text-brand-ink/70 hover:text-brand-ink'
            }`}
          >
            {d.label}
          </button>
        );
      })}
    </div>
  );
};

const ResultsTable: React.FC<{
  title: string;
  areaLabel: string;
  rows: TableRow[];
  progressLabel?: string;
  race: Race;
  colors: Record<string, string>;
  display: Display;
  onDisplay: (d: Display) => void;
  onSelect?: (id: string) => void;
}> = ({ title, areaLabel, rows, progressLabel = 'Reporting', race, colors, display, onDisplay, onSelect }) => {
  const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));
  const activeTab = `results-view-${display}`;

  // Freeze the name column only while the table is wider than its box (phones). A sticky column on a table
  // that fits does nothing, and full-page screenshot tools such as FireShot hide sticky elements as they scroll.
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const check = () => setScrolls(scroller.scrollWidth > scroller.clientWidth + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(scroller);
    if (scroller.firstElementChild) observer.observe(scroller.firstElementChild);
    return () => observer.disconnect();
  }, []);
  const nameCell = scrolls ? 'sticky left-0 bg-white' : '';

  return (
    <div className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
        <h3 className="font-display font-black uppercase text-2xl text-brand-ink">{title}</h3>
        <DisplayTabs display={display} onDisplay={onDisplay} />
      </div>
      <div ref={scrollerRef} id="results-table" role="tabpanel" aria-labelledby={activeTab} className="-mx-5 sm:mx-0 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <caption className="sr-only">{`${title}: ${race.name}`}</caption>
          <thead>
            <tr className="border-b-2 border-brand-ink/15 text-left text-xs uppercase tracking-[0.08em] text-brand-ink/60">
              <th scope="col" className={`${nameCell} py-2 pl-5 sm:pl-0 pr-3 font-bold`}>{areaLabel}</th>
              {race.candidates.map((c) => (
                <th key={c.id} scope="col" className="py-2 px-3 font-bold text-right">
                  <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-[-1px]" style={{ background: colors[c.id] }} aria-hidden="true"></span>
                  {shortName(c.name)}
                </th>
              ))}
              <th scope="col" className="py-2 pl-3 pr-5 sm:pr-0 font-bold text-right">{progressLabel}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-ink/10">
            {sorted.map((row) => {
              const s = standing(row.votes, race.candidates);
              return (
                <tr key={row.id} className="hover:bg-paper/60">
                  <th scope="row" className={`${nameCell} py-2.5 pl-5 sm:pl-0 pr-3 text-left font-semibold text-brand-ink`}>
                    {onSelect ? (
                      <button type="button" onClick={() => onSelect(row.id)} className="text-left underline decoration-brand-ink/25 underline-offset-2 hover:decoration-brand">
                        {row.name}
                      </button>
                    ) : (
                      row.name
                    )}
                    {row.flag && <span className="ml-2 text-xs font-normal text-brand-ink/50">{row.flag}</span>}
                  </th>
                  {race.candidates.map((c) => {
                    const votes = row.votes[c.id] ?? 0;
                    const share = s.total ? formatShare(votes / s.total) : '–';
                    return (
                      <td
                        key={c.id}
                        className={`py-2.5 px-3 text-right tabular-nums whitespace-nowrap ${s.leader?.id === c.id ? 'font-bold text-brand-ink' : 'text-brand-ink/75'}`}
                      >
                        {display === 'votes' ? formatVotes(votes) : display === 'share' ? share : `${formatVotes(votes)} (${share})`}
                      </td>
                    );
                  })}
                  <td className="py-2.5 pl-3 pr-5 sm:pr-0 text-right tabular-nums text-brand-ink/60">{row.progress}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ─── Small pieces ─── */

const MapPlaceholder: React.FC<{ ratio: string }> = ({ ratio }) => (
  <div className="w-full rounded-2xl bg-paper animate-pulse" style={{ aspectRatio: ratio }} aria-busy="true"></div>
);

const ErrorNote: React.FC<{ message: string }> = ({ message }) => (
  <p role="alert" className="flex items-start gap-3 rounded-2xl bg-ember/10 p-4 font-semibold text-brand-ink">
    <Icon icon={faTriangleExclamation} className="mt-1 shrink-0 text-ember" />
    {message}
  </p>
);

const SourceNote: React.FC = () => (
  <div className="mt-12 max-w-3xl text-sm leading-relaxed text-brand-ink/65 space-y-3">
    <p>
      Results are unofficial and come from the{' '}
      <a href={SOS_RESULTS_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline">
        South Dakota Secretary of State
      </a>
      . This page checks for new counts every minute. Counties certify official results after the canvass.
    </p>
    <p>
      Precinct boundaries are approximate. Minnehaha and Pennington County precincts come from those counties, and the
      Lincoln County part of Sioux Falls from the City of Sioux Falls. The rest come from the 2020 Census voting
      districts, matched to the Secretary of State's precinct names. Where a county has redrawn its precincts since 2020,
      its results appear in the table instead of on the map.
    </p>
  </div>
);
