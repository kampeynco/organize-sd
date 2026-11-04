import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { faArrowLeft, faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { fetchCountyMap, type CountyMap } from '../lib/electionResults';
import { fetchDistrictMap, type DistrictMap } from '../lib/voterRegistration';
import { fetchTurnout, isEstimate, turnoutOf, type Turnout, type TurnoutArea } from '../lib/voterTurnout';
import { ResultsMap, formatShare, formatVotes, type MapResult } from './ResultsMap';
import { BinLegend, binColor, shareBins } from './shading';
import { ErrorNote, GEOGRAPHY, MapPlaceholder, PickerLabel, PickerSelect, ResultsTable, Stat, type Geography } from './ui';

// The saved turnout changes about once a day, when it's copied from the SOS; the CDN keeps each copy five minutes
const REFRESH_MS = 5 * 60_000;
const RETRY_MS = 10_000;
const SOS_TURNOUT_URL = 'https://electionresults.sd.gov/VoterTurnoutDetails.aspx?map=TURN';

// One hue, light to dark. Violet stays clear of the party reds and blues on the other maps.
const TURNOUT_COLOR = '#6250d6';

const areaName = (a: TurnoutArea, by: Geography) => (by === 'county' ? `${a.name} County` : a.name);

const points = (diff: number) => `${Math.abs(diff * 100).toFixed(1)} points`;

export const TurnoutView: React.FC<{
  toggle: React.ReactNode;
  /** Whether this view is on screen; a hidden view stops checking for new counts */
  active: boolean;
  by: Geography;
  area: string | null;
  onBy: (g: Geography) => void;
  onArea: (id: string | null) => void;
}> = ({ toggle, active, by, area, onBy, onArea }) => {
  const [turnout, setTurnout] = useState<Turnout | null>(null);
  const [error, setError] = useState('');
  const [countyMap, setCountyMap] = useState<CountyMap | null>(null);
  const [districtMap, setDistrictMap] = useState<DistrictMap | null>(null);
  const [mapError, setMapError] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') setTick((t) => t + 1);
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [active]);

  // Coming back to this view picks up whatever changed while it was hidden
  const wasActive = useRef(active);
  useEffect(() => {
    if (active && !wasActive.current) setTick((t) => t + 1);
    wasActive.current = active;
  }, [active]);

  // District turnout needs more of the state's pages than county turnout, so it can be missing on its own
  const districtsMissing = !!turnout && !turnout.districts && by === 'district';
  useEffect(() => {
    if (!active || (!error && !mapError && !districtsMissing)) return;
    const retry = setTimeout(() => setTick((t) => t + 1), RETRY_MS);
    return () => clearTimeout(retry);
  }, [active, error, mapError, districtsMissing, tick]);

  useEffect(() => {
    let live = true;
    fetchTurnout()
      .then((t) => { if (live) { setTurnout(t); setError(''); } })
      .catch((e: Error) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [tick]);

  useEffect(() => {
    if (countyMap) return;
    fetchCountyMap().then((m) => { setCountyMap(m); setMapError(''); }).catch((e: Error) => setMapError(e.message));
  }, [countyMap, tick]);

  useEffect(() => {
    if (by !== 'district' || districtMap) return;
    fetchDistrictMap().then((m) => { setDistrictMap(m); setMapError(''); }).catch((e: Error) => setMapError(e.message));
  }, [by, districtMap, tick]);

  const areas = by === 'county' ? turnout?.counties ?? null : turnout?.districts ?? null;
  const selected = areas?.find((a) => a.id === area) ?? null;

  const selectArea = (id: string | null) => {
    onArea(id === area ? null : id);
    const map = document.getElementById('turnout-map');
    if (map && map.getBoundingClientRect().top < 0) map.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-paper">
      <section className="grain relative isolate overflow-hidden bg-brand text-white">
        <div className="container mx-auto px-4 sm:px-5 max-w-7xl pt-40 pb-12 md:pb-16 grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 lg:gap-12 items-start">
          <div>
            {toggle}
            <h1 className="mt-8 font-display font-black uppercase text-5xl sm:text-6xl xl:text-7xl leading-[0.9]">
              South Dakota<br /> turnout
            </h1>
            <div className="mt-5 text-white/85">
              <p className="text-lg md:text-xl">2026 General Election</p>
              {turnout?.updated && <p className="mt-1 text-sm text-white/60">Unofficial · updated {turnout.updated}</p>}
            </div>
            {turnout && <Stats statewide={turnout.statewide} by={areas ? by : 'county'} areas={areas ?? turnout.counties} />}
          </div>

          <MapCard
            by={by}
            areas={areas}
            districtsMissing={districtsMissing}
            selected={selected}
            countyMap={countyMap}
            districtMap={districtMap}
            onBy={onBy}
            onSelect={selectArea}
          />
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-5 max-w-7xl py-10 md:py-14">
        {error && !turnout && <ErrorNote message={error} />}
        {error && turnout && (
          <p role="status" className="mb-6 text-sm font-semibold text-brand-ink/70">
            Couldn't check for new turnout just now. These are the last counts we received; we'll keep trying.
          </p>
        )}
        {mapError && <div className="mb-6"><ErrorNote message="The map didn't load. The table below has every count; we'll keep trying." /></div>}
        {!turnout && !error && <p className="text-brand-ink/60" aria-busy="true">Loading turnout…</p>}

        {turnout && (
          <TurnoutDetails
            statewide={turnout.statewide}
            by={by}
            areas={areas}
            districtsMissing={districtsMissing}
            selected={selected}
            onSelect={selectArea}
          />
        )}

        <SourceNote districts={turnout?.districts ?? null} />
      </div>
    </div>
  );
};

/* ─── Hero ─── */

const Stats: React.FC<{ statewide: TurnoutArea; by: Geography; areas: TurnoutArea[] }> = ({ statewide, by, areas }) => {
  const ranked = [...areas].filter((a) => a.voters).sort((a, b) => turnoutOf(b) - turnoutOf(a));
  const extreme = (label: string, a: TurnoutArea | undefined) => {
    // A low number with precincts still out is mostly a count in progress, so say so
    const caveats = [
      ...(by === 'district' && a && isEstimate(a) ? ['estimate'] : []),
      ...(a && a.reporting < a.total ? [`${a.reporting} of ${a.total} precincts in`] : []),
    ];
    return (
      <Stat
        label={`${label} ${by}`}
        value={a ? formatShare(turnoutOf(a)) : '–'}
        detail={a ? `${areaName(a, by)}${caveats.length ? ` (${caveats.join(', ')})` : ''}` : ''}
      />
    );
  };
  return (
    <dl className="mt-8 grid grid-cols-2 gap-3">
      <Stat label="Turnout" value={formatShare(turnoutOf(statewide))} detail={`of ${formatVotes(statewide.voters)} active voters`} />
      <Stat
        label="Ballots cast"
        value={formatVotes(statewide.ballots)}
        detail={`${formatVotes(statewide.reporting)} of ${formatVotes(statewide.total)} precincts in`}
      />
      {extreme('Highest', ranked[0])}
      {extreme('Lowest', ranked[ranked.length - 1])}
    </dl>
  );
};

/* ─── Map card ─── */

const Tip: React.FC<{ area: TurnoutArea; by: Geography }> = ({ area, by }) => (
  <>
    <p className="font-bold text-brand-ink leading-tight">{areaName(area, by)}</p>
    <p className="text-xs text-brand-ink/60">
      {area.reporting} of {area.total} precincts in{area.voteCenters ? ' · votes at vote centers' : ''}
    </p>
    <p className="mt-2 font-display font-black text-3xl leading-none text-brand-ink tabular-nums">{formatShare(turnoutOf(area))}</p>
    <p className="mt-1 text-[13px] text-brand-ink/80">
      {formatVotes(area.ballots)} ballots · {formatVotes(area.voters)} active voters
    </p>
    {!!area.estimated && (
      <p className="mt-1 text-xs text-brand-ink/60">
        {isEstimate(area) ? 'Estimate: about' : 'About'} {formatVotes(area.estimated)} of these ballots were cast where voters from more than
        one district vote together, and are divided among them.
      </p>
    )}
  </>
);

const MapCard: React.FC<{
  by: Geography;
  areas: TurnoutArea[] | null;
  districtsMissing: boolean;
  selected: TurnoutArea | null;
  countyMap: CountyMap | null;
  districtMap: DistrictMap | null;
  onBy: (g: Geography) => void;
  onSelect: (id: string | null) => void;
}> = ({ by, areas, districtsMissing, selected, countyMap, districtMap, onBy, onSelect }) => {
  const geo = GEOGRAPHY[by];
  const shapes = by === 'county' ? countyMap?.counties : districtMap?.districts;
  const viewBox = by === 'county' ? countyMap?.viewBox : districtMap?.viewBox;

  const results = useMemo(() => new Map<string, MapResult>((areas ?? []).map((a) => [a.id, { ...a, votes: {} }])), [areas]);
  const bins = useMemo(() => (areas ? shareBins(areas.map(turnoutOf)) : null), [areas]);
  const estimates = by === 'district' ? (areas ?? []).filter(isEstimate).length : 0;

  let hint = `Hover over a ${geo.label.toLowerCase()} for its turnout, or click or tap one to compare it with the state.`;
  if (by === 'district') hint += ' Double-click or use + to zoom into Sioux Falls and Rapid City.';
  if (selected) hint = `${areaName(selected, by)} is outlined on the map. Its turnout is below, next to the state's.`;

  let map: React.ReactNode = <MapPlaceholder ratio="1000 / 626" />;
  if (districtsMissing) {
    map = (
      <p className="rounded-2xl bg-paper p-6 text-brand-ink/80" role="status">
        District turnout isn't available right now. We'll keep trying; county turnout is ready under Map by.
      </p>
    );
  } else if (areas && shapes && viewBox && bins) {
    map = (
      <ResultsMap
        key={by}
        viewBox={viewBox}
        areas={shapes}
        results={results}
        candidates={[]}
        colors={{}}
        noun={by}
        fill={(r) => binColor(TURNOUT_COLOR, turnoutOf(r as MapResult & TurnoutArea), bins)}
        tooltip={(r) => <Tip area={r as MapResult & TurnoutArea} by={by} />}
        label={`Map of 2026 voter turnout by South Dakota ${geo.title}. The table below lists the same numbers.`}
        onSelect={onSelect}
        highlight={selected?.id}
        zoomable={by === 'district'}
      />
    );
  }

  return (
    <div id="turnout-map" className="min-w-0 rounded-3xl bg-white p-4 sm:p-6 text-brand-ink shadow-2xl shadow-brand-ink/30 scroll-mt-32 lg:scroll-mt-24">
      <h2 className="sr-only">Voter turnout map</h2>
      <div className="flex flex-wrap gap-4">
        <PickerLabel label="Map by" className="w-[calc(50%-0.5rem)] sm:w-auto sm:flex-none">
          <PickerSelect value={by} shown={by === 'county' ? 'County' : 'Legislative district'} onChange={(v) => onBy(v as Geography)}>
            <option value="county">County</option>
            <option value="district">Legislative district</option>
          </PickerSelect>
        </PickerLabel>
        <PickerLabel label={geo.label} className="w-[calc(50%-0.5rem)] sm:w-auto sm:min-w-[14rem] sm:flex-none">
          <PickerSelect
            value={selected?.id ?? ''}
            shown={selected?.name ?? geo.all}
            disabled={!areas}
            onChange={(id) => onSelect(id || null)}
          >
            <option value="">{geo.all}</option>
            {[...(areas ?? [])]
              .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }))
              .map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
          </PickerSelect>
        </PickerLabel>
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <p className="text-sm text-brand-ink/60">{hint}</p>
        {selected && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="shrink-0 inline-flex items-center gap-2 rounded-full bg-paper px-4 py-2 text-sm font-bold text-brand-ink hover:bg-paper-dark transition-colors"
          >
            <Icon icon={faArrowLeft} /> Statewide
          </button>
        )}
      </div>
      <div className="mt-4">{map}</div>
      {areas && bins && (
        <div className="mt-5">
          <BinLegend title="Turnout: ballots cast as a share of active voters" color={TURNOUT_COLOR} bins={bins} plural={geo.plural} />
          {estimates > 0 && (
            <p className="mt-2 text-xs text-brand-ink/60">
              {estimates} districts are estimates, marked in the table below. The state doesn't count ballots by district.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── Below the hero ─── */

const Summary: React.FC<{ id: string; title: string; area: TurnoutArea; estimate?: boolean; children?: React.ReactNode }> = ({
  id,
  title,
  area,
  estimate,
  children,
}) => {
  const share = turnoutOf(area);
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="text-xs font-bold uppercase tracking-[0.15em] text-brand-ink/60">{title}</h3>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-3">
        <span className="font-display font-black text-6xl leading-none text-brand-ink tabular-nums">{formatShare(share)}</span>
        <span className="font-semibold text-brand-ink/70">turnout{estimate ? ' (estimate)' : ''}</span>
      </p>
      <div className="mt-4 h-3 rounded-full bg-brand-ink/[0.07]" aria-hidden="true">
        <div className="h-full rounded-full" style={{ width: `${Math.min(share, 1) * 100}%`, background: TURNOUT_COLOR }}></div>
      </div>
      <p className="mt-3 text-sm text-brand-ink/60">
        {formatVotes(area.ballots)} ballots cast · {formatVotes(area.voters)} active voters · {area.reporting} of {area.total} precincts in
      </p>
      {children}
    </section>
  );
};

const TurnoutDetails: React.FC<{
  statewide: TurnoutArea;
  by: Geography;
  areas: TurnoutArea[] | null;
  districtsMissing: boolean;
  selected: TurnoutArea | null;
  onSelect: (id: string | null) => void;
}> = ({ statewide, by, areas, districtsMissing, selected, onSelect }) => {
  const geo = GEOGRAPHY[by];
  const diff = selected ? turnoutOf(selected) - turnoutOf(statewide) : 0;

  return (
    <article className="rounded-3xl bg-white p-5 sm:p-8 md:p-10 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand">Ballots cast as a share of active voters</p>
      <h2 className="mt-2 font-display font-black uppercase text-4xl md:text-5xl leading-[0.95] text-brand-ink">Voter turnout</h2>

      <div className={`mt-8 grid gap-10 ${selected ? 'lg:grid-cols-2' : ''}`}>
        <Summary id="turnout-statewide-heading" title="Statewide" area={statewide} />
        {selected && (
          <Summary
            id="turnout-area-heading"
            title={areaName(selected, by)}
            area={selected}
            estimate={by === 'district' && isEstimate(selected)}
          >
            <p className="mt-1 text-sm font-semibold text-brand-ink/80">
              {Math.abs(diff) < 0.0005 ? 'Same as the state' : `${points(diff)} ${diff > 0 ? 'above' : 'below'} the state`}
            </p>
          </Summary>
        )}
      </div>

      <div className="mt-8 flex items-start gap-3 rounded-2xl bg-paper p-4 text-sm text-brand-ink/80">
        <Icon icon={faCircleInfo} className="mt-0.5 shrink-0 text-brand" />
        <p>
          {by === 'district'
            ? "The Secretary of State reports turnout by county, not by legislative district. District numbers here add up each precinct's ballots; where voters from more than one district vote at the same place, those ballots are divided among the districts. Districts marked estimate had at least a tenth of their ballots divided this way."
            : 'Turnout is ballots cast divided by active registered voters, as the Secretary of State reports it. Inactive voters are still registered but aren’t counted. All counts are unofficial until the state canvass.'}
        </p>
      </div>

      {districtsMissing && (
        <p className="mt-10 text-brand-ink/60" role="status">District turnout isn't available right now. We'll keep trying.</p>
      )}
      {areas && (
        <ResultsTable
          key={by}
          title={`Turnout by ${geo.title}`}
          caption={`2026 general election turnout by ${geo.title}, highest first`}
          areaLabel={geo.label}
          rows={areas.map((a) => ({
            id: a.id,
            name: a.name,
            votes: {},
            extras: [formatShare(turnoutOf(a)), a.ballots, a.voters, `${a.reporting} of ${a.total}`],
            extraSort: [turnoutOf(a), a.ballots, a.voters, a.total ? a.reporting / a.total : 0],
            ...(by === 'district' && isEstimate(a) ? { flag: 'estimate' } : {}),
          }))}
          extras={['Turnout', 'Ballots cast', 'Active voters', 'Precincts in']}
          candidates={[]}
          colors={{}}
          initialSort={{ key: 'x:0', ascending: false }}
          onSelect={onSelect}
          selected={selected?.id}
        />
      )}
    </article>
  );
};

const SourceNote: React.FC<{ districts: TurnoutArea[] | null }> = ({ districts }) => {
  const apportioned = districts?.reduce((sum, d) => sum + (d.estimated ?? 0), 0) ?? 0;
  const ballots = districts?.reduce((sum, d) => sum + d.ballots, 0) ?? 0;
  return (
    <div className="mt-12 max-w-3xl text-sm leading-relaxed text-brand-ink/65 space-y-3">
      <p>
        County and statewide turnout come from the{' '}
        <a href={SOS_TURNOUT_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline">
          South Dakota Secretary of State's unofficial results
        </a>
        : ballots cast as a share of active registered voters, the way the state reports it. We copy the state's counts
        every day, so they stay here after its results site moves on. Counts are unofficial until the state canvass.
      </p>
      <p>
        The state doesn't report turnout by legislative district, so this page builds it. It adds up the ballots cast in
        each precinct, using the district whose legislative races each precinct voted in, and divides by the state's
        count of active voters in the district. Eleven counties vote at vote centers, where any voter in the county can
        vote, and a few precincts straddle a district line. Ballots cast at those places are divided among their
        districts by the votes cast in each district's legislative races there, adjusted for how often each district's
        voters skipped those races (many were uncontested).
        {ballots > 0 &&
          ` That covers ${formatVotes(apportioned)} of ${formatVotes(ballots)} ballots (${formatShare(apportioned / ballots)}).`}{' '}
        Districts with a tenth or more of their ballots divided this way are marked estimate; their turnout could be off
        by a point or two.
      </p>
      <p>
        District lines are the Secretary of State's map of the 35 legislative districts. Districts 26 and 28 elect their House
        members from two halves, A and B, so they appear as four areas.
      </p>
    </div>
  );
};
