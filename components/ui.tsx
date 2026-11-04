import React, { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon';
import { faCaretDown, faCaretUp, faChevronDown, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';
import type { Candidate } from '../lib/electionResults';
import { formatShare, formatVotes, standing } from './ResultsMap';

/* ─── View switch ─── */

export type View = 'results' | 'turnout' | 'registration';

// Phones get one-word labels so all three buttons fit on one line
const VIEWS: { id: View; label: string; short: string }[] = [
  { id: 'results', label: 'Election results', short: 'Results' },
  { id: 'turnout', label: 'Voter turnout', short: 'Turnout' },
  { id: 'registration', label: 'Voter registration', short: 'Registration' },
];

/** Switches the whole page between 2026 results, 2026 turnout and current registration. Sits in each view's hero. */
export const ViewToggle: React.FC<{ view: View; onView: (v: View) => void }> = ({ view, onView }) => (
  <div role="group" aria-label="Show" className="inline-flex max-w-full rounded-full bg-white/10 p-1 ring-1 ring-white/20">
    {VIEWS.map((v) => {
      const active = v.id === view;
      return (
        <button
          key={v.id}
          type="button"
          aria-pressed={active}
          onClick={() => onView(v.id)}
          className={`rounded-full px-3.5 sm:px-5 py-2 text-sm font-bold whitespace-nowrap transition-colors ${
            active ? 'bg-white text-brand-ink shadow' : 'text-white/80 hover:text-white'
          }`}
        >
          <span className="sm:hidden">{v.short}</span>
          <span className="hidden sm:inline">{v.label}</span>
        </button>
      );
    })}
  </div>
);

/** How the registration and turnout views divide the state; they share the choice, so switching keeps it */
export type Geography = 'county' | 'district';

export const GEOGRAPHY = {
  county: { plural: 'counties', label: 'County', all: 'All counties', title: 'county' },
  district: { plural: 'legislative districts', label: 'District', all: 'All districts', title: 'legislative district' },
} as const;

/* ─── Hero ─── */

export const Stat: React.FC<{ label: string; value: string; detail: string }> = ({ label, value, detail }) => (
  <div className="min-w-0 rounded-2xl bg-white/10 ring-1 ring-white/15 p-3 sm:p-4">
    <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/70">{label}</dt>
    <dd className="mt-1 font-display font-black text-3xl sm:text-4xl leading-none">{value}</dd>
    <dd className="mt-1 text-xs sm:text-sm text-white/70">{detail}</dd>
  </div>
);

/* ─── Map card ─── */

const fieldClass = 'rounded-xl px-4 py-3 font-semibold';

/**
 * A native select drawn as a box whose label can wrap, so a long office name stays readable on a narrow phone
 * (a select's own text can't wrap, and text under 16px makes iPhones zoom in). The real select sits on top,
 * invisible, so taps, keyboards and screen readers all use it, and its widest option still sets the field's width.
 */
export const PickerSelect: React.FC<{
  value: string;
  shown: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  children: React.ReactNode;
}> = ({ value, shown, disabled = false, onChange, children }) => (
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

export const PickerLabel: React.FC<{ label: string; className?: string; children: React.ReactNode }> = ({
  label,
  className = '',
  children,
}) => (
  <label className={`block ${className}`}>
    <span className="text-xs font-bold uppercase tracking-[0.15em] text-brand">{label}</span>
    {children}
  </label>
);

export const MapPlaceholder: React.FC<{ ratio: string }> = ({ ratio }) => (
  <div className="w-full rounded-2xl bg-paper animate-pulse" style={{ aspectRatio: ratio }} aria-busy="true"></div>
);

/* ─── Below the hero ─── */

export const ErrorNote: React.FC<{ message: string }> = ({ message }) => (
  <p role="alert" className="flex items-start gap-3 rounded-2xl bg-ember/10 p-4 font-semibold text-brand-ink">
    <Icon icon={faTriangleExclamation} className="mt-1 shrink-0 text-ember" />
    {message}
  </p>
);

/** One row per candidate (or party): name, share, count and a bar */
export const CandidateRows: React.FC<{
  candidates: Candidate[];
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

/** What each count cell shows: the count, the share, or "1,234 (56.7%)" */
export type Display = 'votes' | 'share' | 'both';

const DISPLAYS: { id: Display; label: string }[] = [
  { id: 'votes', label: 'Numbers' },
  { id: 'share', label: 'Percentage' },
  { id: 'both', label: 'Both' },
];

const DisplayTabs: React.FC<{ display: Display; onDisplay: (d: Display) => void; idPrefix: string }> = ({
  display,
  onDisplay,
  idPrefix,
}) => {
  const onTabKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const i = DISPLAYS.findIndex((d) => d.id === display);
    const next = DISPLAYS[(i + (e.key === 'ArrowRight' ? 1 : DISPLAYS.length - 1)) % DISPLAYS.length].id;
    onDisplay(next);
    document.getElementById(`${idPrefix}-view-${next}`)?.focus();
  };

  return (
    <div role="tablist" aria-label="Show counts as" className="inline-flex rounded-full bg-paper p-1 gap-1">
      {DISPLAYS.map((d) => {
        const active = d.id === display;
        return (
          <button
            key={d.id}
            id={`${idPrefix}-view-${d.id}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`${idPrefix}-table`}
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

export interface TableRow {
  id: string;
  name: string;
  votes: Record<string, number>;
  /** Cells after the candidate columns, in the order of the table's `extras` labels. Numbers print with commas. */
  extras: (string | number)[];
  /** Sort keys for the extra cells, where they aren't numbers already */
  extraSort?: number[];
  flag?: string;
}

/** "Larry Rhoden and Tony Venhuizen" -> "Rhoden", for narrow column headings */
const shortName = (c: Candidate) => {
  if (c.short) return c.short;
  const words = c.name.split(' and ')[0].split(' ').filter((w) => !/^(jr|sr|ii|iii|iv)\.?$/i.test(w));
  return words[words.length - 1] ?? c.name;
};

/** null sorts by name; otherwise a candidate id ("c:<id>") or an extra column ("x:<index>"), largest first unless flipped */
export type TableSort = { key: string; ascending: boolean } | null;

export const ResultsTable: React.FC<{
  title: string;
  caption: string;
  areaLabel: string;
  rows: TableRow[];
  candidates: Candidate[];
  colors: Record<string, string>;
  extras: string[];
  /** How candidate cells show their counts; without onDisplay the table has no tabs to change it */
  display?: Display;
  onDisplay?: (d: Display) => void;
  /** Starting order; defaults to A–Z */
  initialSort?: TableSort;
  onSelect?: (id: string) => void;
  /** Row to mark, e.g. the area picked on the map */
  selected?: string | null;
}> = ({ title, caption, areaLabel, rows, candidates, colors, extras, display = 'votes', onDisplay, initialSort = null, onSelect, selected }) => {
  const idPrefix = useId().replace(/:/g, '');
  const [sort, setSort] = useState<TableSort>(initialSort);

  const totals = new Map(rows.map((r) => [r.id, standing(r.votes, candidates)]));
  const keyOf = (row: TableRow): number | string => {
    if (!sort) return row.name;
    const [kind, ref] = [sort.key.slice(0, 1), sort.key.slice(2)];
    if (kind === 'x') {
      const i = +ref;
      const cell = row.extras[i];
      return row.extraSort?.[i] ?? (typeof cell === 'number' ? cell : 0);
    }
    const votes = row.votes[ref] ?? 0;
    const total = totals.get(row.id)?.total ?? 0;
    return display === 'share' ? (total ? votes / total : -1) : votes;
  };
  const byName = (a: TableRow, b: TableRow) => a.name.localeCompare(b.name, 'en', { numeric: true });
  const sorted = [...rows].sort((a, b) => {
    if (!sort) return byName(a, b);
    const [ka, kb] = [keyOf(a) as number, keyOf(b) as number];
    return (sort.ascending ? ka - kb : kb - ka) || byName(a, b);
  });

  const onSort = (key: string | null) =>
    setSort((s) => {
      if (key === null) return null;
      // A second click flips the order; a third goes back to A–Z
      if (s?.key !== key) return { key, ascending: false };
      return s.ascending ? null : { key, ascending: true };
    });
  const ariaSort = (key: string | null): React.AriaAttributes['aria-sort'] => {
    if (key === null) return sort ? undefined : 'ascending';
    if (sort?.key !== key) return undefined;
    return sort.ascending ? 'ascending' : 'descending';
  };
  // A plain function, not a component, so a re-sort keeps the same button and its keyboard focus
  const sortHead = (sortKey: string | null, className: string, children: React.ReactNode) => {
    const state = ariaSort(sortKey);
    return (
      <th key={sortKey ?? 'name'} scope="col" aria-sort={state} className={className}>
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className={`inline-flex items-center gap-1 uppercase tracking-[0.08em] font-bold hover:text-brand-ink ${state ? 'text-brand-ink' : ''}`}
        >
          {children}
          <Icon icon={state === 'ascending' ? faCaretUp : faCaretDown} className={state ? '' : 'opacity-0'} />
        </button>
      </th>
    );
  };

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
        {onDisplay && <DisplayTabs display={display} onDisplay={onDisplay} idPrefix={idPrefix} />}
      </div>
      <div
        ref={scrollerRef}
        id={`${idPrefix}-table`}
        {...(onDisplay ? { role: 'tabpanel', 'aria-labelledby': `${idPrefix}-view-${display}` } : {})}
        className="-mx-5 sm:mx-0 overflow-x-auto"
      >
        <table className="w-full min-w-[34rem] text-sm">
          <caption className="sr-only">{`${caption}. Column headings sort the table.`}</caption>
          <thead>
            <tr className="border-b-2 border-brand-ink/15 text-left text-xs text-brand-ink/60">
              {sortHead(null, `${nameCell} py-2 pl-5 sm:pl-0 pr-3`, areaLabel)}
              {candidates.map((c) =>
                sortHead(
                  `c:${c.id}`,
                  'py-2 px-3 text-right',
                  <>
                    <span className="inline-block w-2.5 h-2.5 rounded-full align-[-1px]" style={{ background: colors[c.id] }} aria-hidden="true"></span>
                    {shortName(c)}
                  </>
                )
              )}
              {extras.map((label, i) =>
                sortHead(`x:${i}`, `py-2 pl-3 text-right ${i === extras.length - 1 ? 'pr-5 sm:pr-0' : 'pr-3'}`, label)
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-ink/10">
            {sorted.map((row) => {
              const s = totals.get(row.id)!;
              const isSelected = selected === row.id;
              return (
                <tr key={row.id} className={isSelected ? 'bg-paper' : 'hover:bg-paper/60'}>
                  <th scope="row" className={`${nameCell} ${isSelected && scrolls ? 'bg-paper' : ''} py-2.5 pl-5 sm:pl-0 pr-3 text-left font-semibold text-brand-ink`}>
                    {onSelect ? (
                      <button
                        type="button"
                        onClick={() => onSelect(row.id)}
                        aria-current={isSelected || undefined}
                        className="text-left underline decoration-brand-ink/25 underline-offset-2 hover:decoration-brand"
                      >
                        {row.name}
                      </button>
                    ) : (
                      row.name
                    )}
                    {row.flag && <span className="ml-2 text-xs font-normal text-brand-ink/50">{row.flag}</span>}
                  </th>
                  {candidates.map((c) => {
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
                  {row.extras.map((cell, i) => (
                    <td
                      key={extras[i]}
                      className={`py-2.5 pl-3 text-right tabular-nums whitespace-nowrap text-brand-ink/60 ${i === extras.length - 1 ? 'pr-5 sm:pr-0' : 'pr-3'}`}
                    >
                      {typeof cell === 'number' ? formatVotes(cell) : cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
