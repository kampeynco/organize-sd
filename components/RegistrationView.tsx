import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';
import { faArrowLeft, faCircleInfo } from '@fortawesome/free-solid-svg-icons';
import { fetchCountyMap, type CountyMap } from '../lib/electionResults';
import {
  PARTIES,
  fetchDistrictMap,
  fetchRegistration,
  type DistrictMap,
  type PartyCode,
  type Registration,
  type RegistrationArea,
} from '../lib/voterRegistration';
import { ResultsLegend, ResultsMap, formatShare, formatVotes, raceColors, standing, type MapResult } from './ResultsMap';
import { BinLegend, binColor, shareBins } from './shading';
import {
  CandidateRows,
  ErrorNote,
  GEOGRAPHY,
  MapPlaceholder,
  PickerLabel,
  PickerSelect,
  ResultsTable,
  Stat,
  type Display,
  type Geography,
} from './ui';

// Registration is copied from the SOS once a day; the CDN keeps each copy five minutes
const REFRESH_MS = 15 * 60_000;
const RETRY_MS = 10_000;
const SOS_REGISTRATION_URL = 'https://sdsos.gov/elections-voting/upcoming-elections/voter-registration-totals/default.aspx';

/** What the map colors: the largest party in each area, or one party's share of active voters */
export type Show = 'lead' | PartyCode;

// Party colors follow the results map's rules, so Republicans are red and Democrats blue in both views
const COLORS = raceColors(PARTIES);
const partyOf = (code: string) => PARTIES.find((p) => p.id === code)!;

const SHARE_TITLES: Record<PartyCode, string> = {
  REP: 'Republicans',
  DEM: 'Democrats',
  IND: 'Independents',
  NPA: 'Voters with no party',
  LIB: 'Libertarians',
  OTH: 'Other parties',
};

const areaName = (a: RegistrationArea, by: Geography) => (by === 'county' ? `${a.name} County` : a.name);

/* ─── View ─── */

export const RegistrationView: React.FC<{
  toggle: React.ReactNode;
  active: boolean;
  show: Show;
  by: Geography;
  area: string | null;
  onShow: (s: Show) => void;
  onBy: (g: Geography) => void;
  onArea: (id: string | null) => void;
}> = ({ toggle, active, show, by, area, onShow, onBy, onArea }) => {
  const [registration, setRegistration] = useState<Registration | null>(null);
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

  useEffect(() => {
    if (!error && !mapError) return;
    const retry = setTimeout(() => setTick((t) => t + 1), RETRY_MS);
    return () => clearTimeout(retry);
  }, [error, mapError, tick]);

  useEffect(() => {
    let live = true;
    fetchRegistration()
      .then((r) => { if (live) { setRegistration(r); setError(''); } })
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

  // The SOS lists counties by name; the map knows them by the SOS county number
  const counties = useMemo(() => {
    if (!registration || !countyMap) return null;
    const idByName = new Map(countyMap.counties.map((c) => [c.name.toLowerCase(), c.id]));
    return registration.counties.map((c) => ({ ...c, id: idByName.get(c.name.toLowerCase()) ?? c.name }));
  }, [registration, countyMap]);

  const areas = by === 'county' ? counties : registration?.districts ?? null;
  const selected = areas?.find((a) => a.id === area) ?? null;

  const selectArea = (id: string | null) => {
    onArea(id === area ? null : id);
    const map = document.getElementById('registration-map');
    if (map && map.getBoundingClientRect().top < 0) map.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-paper">
      <section className="grain relative isolate overflow-hidden bg-brand text-white">
        <div className="container mx-auto px-4 sm:px-5 max-w-7xl pt-40 pb-12 md:pb-16 grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 lg:gap-12 items-start">
          <div>
            {toggle}
            <h1 className="mt-8 font-display font-black uppercase text-5xl sm:text-6xl xl:text-7xl leading-[0.9]">
              South Dakota<br /> voters
            </h1>
            <div className="mt-5 text-white/85">
              <p className="text-lg md:text-xl">Voter registration by party</p>
              {registration && (
                <p className="mt-1 text-sm text-white/60">Secretary of State totals as of {registration.checked}</p>
              )}
            </div>
            {registration && <Stats statewide={registration.statewide} />}
          </div>

          <MapCard
            show={show}
            by={by}
            areas={areas}
            selected={selected}
            countyMap={countyMap}
            districtMap={districtMap}
            onShow={onShow}
            onBy={onBy}
            onSelect={selectArea}
          />
        </div>
      </section>

      <div className="container mx-auto px-4 sm:px-5 max-w-7xl py-10 md:py-14">
        {error && !registration && <ErrorNote message={error} />}
        {error && registration && (
          <p role="status" className="mb-6 text-sm font-semibold text-brand-ink/70">
            Couldn't check for new registration totals just now. These are the last we received; we'll keep trying.
          </p>
        )}
        {mapError && <div className="mb-6"><ErrorNote message="The map didn't load. The table below has every count; we'll keep trying." /></div>}
        {!registration && !error && <p className="text-brand-ink/60" aria-busy="true">Loading voter registration…</p>}

        {registration && (
          <PartyRegistration
            statewide={registration.statewide}
            by={by}
            areas={areas}
            selected={selected}
            onSelect={selectArea}
          />
        )}

        <SourceNote registration={registration} />
      </div>
    </div>
  );
};

/* ─── Hero ─── */

const Stats: React.FC<{ statewide: RegistrationArea }> = ({ statewide }) => {
  const { votes, active, inactive } = statewide;
  const share = (n: number) => (active ? formatShare(n / active) : '–');
  const unaffiliated = votes.IND + votes.NPA;
  return (
    <dl className="mt-8 grid grid-cols-2 gap-3">
      <Stat label="Active voters" value={formatVotes(active)} detail={`plus ${formatVotes(inactive)} inactive`} />
      <Stat label="Republican" value={share(votes.REP)} detail={`${formatVotes(votes.REP)} voters`} />
      <Stat label="Democrat" value={share(votes.DEM)} detail={`${formatVotes(votes.DEM)} voters`} />
      <Stat label="Independent or no party" value={share(unaffiliated)} detail={`${formatVotes(unaffiliated)} voters`} />
    </dl>
  );
};

/* ─── Map card ─── */

const MapCard: React.FC<{
  show: Show;
  by: Geography;
  areas: RegistrationArea[] | null;
  selected: RegistrationArea | null;
  countyMap: CountyMap | null;
  districtMap: DistrictMap | null;
  onShow: (s: Show) => void;
  onBy: (g: Geography) => void;
  onSelect: (id: string | null) => void;
}> = ({ show, by, areas, selected, countyMap, districtMap, onShow, onBy, onSelect }) => {
  const geo = GEOGRAPHY[by];
  const shapes = by === 'county' ? countyMap?.counties : districtMap?.districts;
  const viewBox = by === 'county' ? countyMap?.viewBox : districtMap?.viewBox;

  const results = useMemo(
    () =>
      new Map<string, MapResult>(
        (areas ?? []).map((a) => [
          a.id,
          { ...a, detail: `${formatVotes(a.active)} active voters · ${formatVotes(a.inactive)} inactive` },
        ])
      ),
    [areas]
  );

  const bins = useMemo(
    () => (show === 'lead' || !areas ? null : shareBins(areas.map((a) => (a.active ? a.votes[show] / a.active : 0)))),
    [show, areas]
  );
  const fill =
    show === 'lead' || !bins
      ? undefined
      : (r: MapResult) => {
          const a = r as MapResult & RegistrationArea;
          return binColor(COLORS[show], a.active ? a.votes[show] / a.active : 0, bins);
        };

  // Only parties that lead somewhere get a row in the legend
  const leaders = useMemo(
    () => PARTIES.filter((p) => (areas ?? []).some((a) => standing(a.votes, PARTIES).leader?.id === p.id)),
    [areas]
  );

  const showName = show === 'lead' ? 'Largest party' : `${partyOf(show).name} share`;
  let hint = `Hover over a ${geo.label.toLowerCase()} for its party breakdown, or click or tap one to compare it with the state.`;
  if (by === 'district') hint += ' Double-click or use + to zoom into Sioux Falls and Rapid City.';
  if (selected) hint = `${areaName(selected, by)} is outlined on the map. Its breakdown is below, next to the state's.`;

  let map: React.ReactNode = <MapPlaceholder ratio="1000 / 626" />;
  if (areas && shapes && viewBox) {
    map = (
      <ResultsMap
        key={by}
        viewBox={viewBox}
        areas={shapes}
        results={results}
        candidates={PARTIES}
        colors={COLORS}
        noun={by}
        fill={fill}
        label={`Map of ${showName.toLowerCase()} of active voters by South Dakota ${geo.title}. The table below lists the same counts.`}
        onSelect={onSelect}
        highlight={selected?.id}
        zoomable={by === 'district'}
      />
    );
  }

  return (
    <div id="registration-map" className="min-w-0 rounded-3xl bg-white p-4 sm:p-6 text-brand-ink shadow-2xl shadow-brand-ink/30 scroll-mt-32 lg:scroll-mt-24">
      <h2 className="sr-only">Voter registration map</h2>
      <div className="flex flex-wrap gap-4">
        <PickerLabel label="Show" className="min-w-0 flex-[1_1_auto]">
          <PickerSelect value={show} shown={showName} onChange={(v) => onShow(v as Show)}>
            <option value="lead">Largest party</option>
            <optgroup label="Share of active voters">
              {PARTIES.map((p) => (
                <option key={p.id} value={p.id}>{p.name} share</option>
              ))}
            </optgroup>
          </PickerSelect>
        </PickerLabel>
        <PickerLabel label="Map by" className="w-[calc(50%-0.5rem)] sm:w-auto sm:flex-none">
          <PickerSelect value={by} shown={by === 'county' ? 'County' : 'Legislative district'} onChange={(v) => onBy(v as Geography)}>
            <option value="county">County</option>
            <option value="district">Legislative district</option>
          </PickerSelect>
        </PickerLabel>
        <PickerLabel label={geo.label} className="w-[calc(50%-0.5rem)] sm:w-auto sm:flex-none">
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
      {areas && (
        <div className="mt-5">
          {show === 'lead' || !bins ? (
            <ResultsLegend candidates={leaders} colors={COLORS} title="Largest party, by lead (points)" showUnreported={false} />
          ) : (
            <BinLegend title={`${SHARE_TITLES[show]}, as a share of active voters`} color={COLORS[show]} bins={bins} plural={geo.plural} />
          )}
        </div>
      )}
    </div>
  );
};

/* ─── Below the hero ─── */

const PartyRegistration: React.FC<{
  statewide: RegistrationArea;
  by: Geography;
  areas: RegistrationArea[] | null;
  selected: RegistrationArea | null;
  onSelect: (id: string | null) => void;
}> = ({ statewide, by, areas, selected, onSelect }) => {
  const [display, setDisplay] = useState<Display>('share');
  const geo = GEOGRAPHY[by];
  const totals = (a: RegistrationArea) => (
    <p className="mt-4 text-sm text-brand-ink/60">
      {formatVotes(a.active)} active voters · {formatVotes(a.inactive)} inactive
    </p>
  );

  return (
    <article className="rounded-3xl bg-white p-5 sm:p-8 md:p-10 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-brand">Active registered voters</p>
      <h2 className="mt-2 font-display font-black uppercase text-4xl md:text-5xl leading-[0.95] text-brand-ink">
        Party registration
      </h2>

      <div className={`mt-8 grid gap-10 ${selected ? 'lg:grid-cols-2' : ''}`}>
        <section aria-labelledby="registration-statewide-heading">
          <h3 id="registration-statewide-heading" className="text-xs font-bold uppercase tracking-[0.15em] text-brand-ink/60">Statewide</h3>
          <CandidateRows candidates={PARTIES} votes={statewide.votes} colors={COLORS} showParty={false} />
          {totals(statewide)}
        </section>
        {selected && (
          <section aria-labelledby="registration-area-heading">
            <h3 id="registration-area-heading" className="text-xs font-bold uppercase tracking-[0.15em] text-brand-ink/60">
              {areaName(selected, by)}
            </h3>
            <CandidateRows candidates={PARTIES} votes={selected.votes} colors={COLORS} showParty={false} />
            {totals(selected)}
          </section>
        )}
      </div>

      <div className="mt-8 flex items-start gap-3 rounded-2xl bg-paper p-4 text-sm text-brand-ink/80">
        <Icon icon={faCircleInfo} className="mt-0.5 shrink-0 text-brand" />
        <p>
          South Dakota has no Independent Party. Voters listed as Independent chose that on their registration form; voters with
          no party affiliation left the party blank when they first registered. Inactive voters are still registered but aren't
          counted in the active totals.
        </p>
      </div>

      {areas ? (
        <ResultsTable
          title={`Registration by ${geo.title}`}
          caption={`Active voter registration by party and ${geo.title}`}
          areaLabel={geo.label}
          rows={areas.map((a) => ({ ...a, extras: [a.active, a.inactive] }))}
          extras={['Active', 'Inactive']}
          candidates={PARTIES}
          colors={COLORS}
          display={display}
          onDisplay={setDisplay}
          onSelect={onSelect}
          selected={selected?.id}
        />
      ) : (
        <p className="mt-10 text-brand-ink/60" aria-busy="true">Loading…</p>
      )}
    </article>
  );
};

const SourceNote: React.FC<{ registration: Registration | null }> = ({ registration }) => {
  const districtActive = registration?.districts.reduce((sum, d) => sum + d.active, 0) ?? 0;
  const stateActive = registration?.statewide.active ?? 0;
  return (
    <div className="mt-12 max-w-3xl text-sm leading-relaxed text-brand-ink/65 space-y-3">
      <p>
        Registration counts come from the{' '}
        <a href={SOS_REGISTRATION_URL} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline">
          South Dakota Secretary of State's current voter registration totals
        </a>
        . We copy them every day; the time above is when we last did. Party shares are of active voters. A few voters have no party code in the
        state's file; like the Secretary of State's statewide totals, they're counted as Other.
      </p>
      {registration && districtActive !== stateActive && (
        <p>
          The Secretary of State's legislative district totals add up to {formatVotes(districtActive)} active voters, slightly
          different from its county and statewide totals ({formatVotes(stateActive)}). Each table shows the counts as published.
        </p>
      )}
      <p>
        District lines are the Secretary of State's map of the 35 legislative districts. Districts 26 and 28 elect their House
        members from two halves, A and B, so they appear as four areas.
      </p>
    </div>
  );
};
