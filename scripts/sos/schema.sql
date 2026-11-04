-- South Dakota Secretary of State data that /results shows. A daily Vercel cron (api/save-sos.ts) and
-- `npm run save:sos` copy it from the SOS (api/_sos-save.ts); the page reads it from here, so it outlasts the SOS
-- site, and registration keeps a daily history. Safe to re-run: it only creates what's missing.

create schema if not exists sos;
comment on schema sos is 'South Dakota Secretary of State election data saved for /results (organize-sd scripts/sos)';

-- The 66 counties, by the SOS county number every SOS source uses ('01' .. '66')
create table if not exists sos.counties (
  county_id text primary key,
  name text not null unique
);

-- One row per election saved, e.g. '2026-general'
create table if not exists sos.elections (
  election_id text primary key,
  election_date date not null,
  -- The SOS results site's heading for the election, and the banner under it, if any
  title text not null,
  message text,
  -- When the SOS last changed its results, from its data service
  results_updated_at timestamptz,
  saved_at timestamptz not null default now()
);

-- Statewide offices (SWR), ballot questions (BQ) and legislative races (LEG)
create table if not exists sos.races (
  election_id text not null references sos.elections on delete cascade,
  race_id integer not null,
  race_type text not null check (race_type in ('SWR', 'BQ', 'LEG')),
  -- 'United States Senator', 'Constitutional Amendment I', 'State Senator'
  name text not null,
  -- Ballot questions: the text after the name on the SOS page
  question text,
  -- Legislative races: '1' .. '35', or '26A', '26B', '28A', '28B' for those House races
  district text,
  -- Ballot position of the office
  office_seq integer not null,
  vote_for integer not null,
  precincts_reporting integer not null,
  precincts_partial integer not null,
  precincts_total integer not null,
  primary key (election_id, race_id)
);

-- Candidates, or Yes/No for ballot questions, with their statewide (or districtwide) votes
create table if not exists sos.candidates (
  election_id text not null,
  race_id integer not null,
  candidate_id text not null,
  name text not null,
  party_code text not null,
  party_name text not null,
  ballot_order integer not null,
  votes integer not null,
  winner boolean not null,
  primary key (election_id, race_id, candidate_id),
  foreign key (election_id, race_id) references sos.races on delete cascade
);

create table if not exists sos.county_results (
  election_id text not null,
  race_id integer not null,
  county_id text not null references sos.counties,
  candidate_id text not null,
  votes integer not null,
  precincts_reporting integer not null,
  precincts_partial integer not null,
  precincts_total integer not null,
  primary key (election_id, race_id, county_id, candidate_id),
  foreign key (election_id, race_id, candidate_id) references sos.candidates on delete cascade
);
create index if not exists county_results_county_idx on sos.county_results (county_id);

-- Precincts, or voting locations in vote-center counties (ids like 'C740'). Precinct ids repeat across counties.
create table if not exists sos.precinct_results (
  election_id text not null,
  race_id integer not null,
  county_id text not null references sos.counties,
  precinct_id text not null,
  precinct_name text not null,
  candidate_id text not null,
  votes integer not null,
  reported boolean not null,
  primary key (election_id, race_id, county_id, precinct_id, candidate_id),
  foreign key (election_id, race_id, candidate_id) references sos.candidates on delete cascade
);
create index if not exists precinct_results_precinct_idx on sos.precinct_results (county_id, precinct_id);

-- Turnout: ballots cast and active voters, statewide, by county and by legislative district, as /results shows it.
-- The SOS reports counties only; district rows are built by api/voter-turnout.ts.
create table if not exists sos.turnout (
  election_id text not null references sos.elections on delete cascade,
  geography text not null check (geography in ('state', 'county', 'district')),
  -- 'SD'; a county_id; or a district id as in sos.races
  area_id text not null,
  name text not null,
  ballots integer not null,
  active_voters integer not null,
  precincts_reporting integer not null,
  precincts_total integer not null,
  -- State and counties: precincts with only part of their votes counted
  precincts_partial integer not null default 0,
  -- Counties whose voters can vote at any vote center
  vote_centers boolean not null default false,
  -- Districts: ballots divided among districts because they were cast where several districts vote together
  apportioned_ballots integer not null default 0,
  primary key (election_id, geography, area_id)
);

-- Ballots cast per precinct or vote center, from the SOS turnout details page (no SOS precinct ids there).
-- Names are as api/voter-turnout.ts matches them: spaces collapsed, upper case.
create table if not exists sos.precinct_turnout (
  election_id text not null references sos.elections on delete cascade,
  county_id text not null references sos.counties,
  precinct_name text not null,
  ballots integer not null,
  primary key (election_id, county_id, precinct_name)
);
create index if not exists precinct_turnout_county_idx on sos.precinct_turnout (county_id);

-- Registered voters by party and status, one copy per day saved. The SOS publishes no as-of date, so as_of is
-- the day (Central time) the counts were read.
create table if not exists sos.registration (
  as_of date not null,
  geography text not null check (geography in ('county', 'district')),
  -- A county_id, or a district id as in sos.races
  area_id text not null,
  -- As the SOS file has it: REP, DEM, IND, NPA, LIB, OTH, or '' where the voter has no party code. /results and
  -- the SOS statewide totals count '' as OTH.
  party_code text not null,
  status text not null check (status in ('Active', 'Inactive')),
  voters integer not null,
  checked_at timestamptz not null,
  primary key (as_of, geography, area_id, party_code, status)
);
