import React, { useEffect, useState } from 'react';
import { ResultsView } from './ResultsView';
import { RegistrationView, type Show } from './RegistrationView';
import { TurnoutView } from './TurnoutView';
import { PARTY_CODES } from '../lib/voterRegistration';
import { ViewToggle, type Geography, type View } from './ui';

const TITLES: Record<View, string> = {
  results: 'South Dakota Election Results',
  turnout: 'South Dakota Voter Turnout',
  registration: 'South Dakota Voter Registration',
};

const VIEWS: View[] = ['results', 'turnout', 'registration'];

/**
 * Everything on screen lives in the address so a view can be shared:
 *   /results?race=14412&county=49                              results
 *   /results?view=turnout&by=district&area=15                  turnout
 *   /results?view=registration&show=DEM&by=district&area=15    registration
 * Turnout and registration share `by` and `area`, so switching between them keeps the same county or district.
 */
function readAddress() {
  // results.html is prerendered at build time, where there is no window
  const p = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  const show = p.get('show')?.toUpperCase();
  const view = p.get('view') as View | null;
  return {
    view: view && VIEWS.includes(view) ? view : 'results',
    raceId: p.get('race'),
    countyId: p.get('county'),
    show: ((PARTY_CODES as string[]).includes(show ?? '') ? show : 'lead') as Show,
    by: (p.get('by') === 'district' ? 'district' : 'county') as Geography,
    area: p.get('area'),
  };
}

export const ResultsPage: React.FC = () => {
  const [initial] = useState(readAddress);
  const [view, setView] = useState<View>(initial.view);
  const [raceId, setRaceId] = useState(initial.raceId);
  const [countyId, setCountyId] = useState(initial.countyId);
  const [show, setShow] = useState<Show>(initial.show);
  const [by, setBy] = useState<Geography>(initial.by);
  const [area, setArea] = useState(initial.area);
  // A view loads the first time it's opened, then stays mounted (hidden) so switching back is instant
  const [opened, setOpened] = useState<Record<View, boolean>>({
    results: initial.view === 'results',
    turnout: initial.view === 'turnout',
    registration: initial.view === 'registration',
  });

  const switchView = (v: View) => {
    setOpened((o) => ({ ...o, [v]: true }));
    setView(v);
  };

  const changeBy = (g: Geography) => {
    setBy(g);
    setArea(null);
  };

  // Put the site's own title back on the way out (declared first, so it reads the title before the next effect sets it)
  useEffect(() => {
    const previous = document.title;
    return () => { document.title = previous; };
  }, []);

  useEffect(() => {
    const p = new URLSearchParams();
    if (view === 'results') {
      if (raceId) p.set('race', raceId);
      if (countyId) p.set('county', countyId);
    } else {
      p.set('view', view);
      if (view === 'registration' && show !== 'lead') p.set('show', show);
      if (by !== 'county') p.set('by', by);
      if (area) p.set('area', area);
    }
    const query = p.toString();
    window.history.replaceState(window.history.state, '', query ? `/results?${query}` : '/results');
    document.title = `${TITLES[view]} | Organize SD`;
  }, [view, raceId, countyId, show, by, area]);

  const toggle = <ViewToggle view={view} onView={switchView} />;

  return (
    <div className="bg-paper">
      {opened.results && (
        <div hidden={view !== 'results'}>
          <ResultsView
            toggle={toggle}
            active={view === 'results'}
            raceId={raceId}
            countyId={countyId}
            onRace={setRaceId}
            onCounty={setCountyId}
          />
        </div>
      )}
      {opened.turnout && (
        <div hidden={view !== 'turnout'}>
          <TurnoutView toggle={toggle} active={view === 'turnout'} by={by} area={area} onBy={changeBy} onArea={setArea} />
        </div>
      )}
      {opened.registration && (
        <div hidden={view !== 'registration'}>
          <RegistrationView
            toggle={toggle}
            active={view === 'registration'}
            show={show}
            by={by}
            area={area}
            onShow={setShow}
            onBy={changeBy}
            onArea={setArea}
          />
        </div>
      )}
    </div>
  );
};
