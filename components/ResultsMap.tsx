import React, { useId, useRef, useState } from 'react';
import { Icon } from './Icon';
import { faMinus, faPlus, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
import type { AreaResult, Candidate } from '../lib/electionResults';

/* ─── Color ─── */

// Party hues from the data-viz reference palette. Any two areas on a map can touch, so each set a race can put
// on screen was validated all-pairs for color-blind separation. Blue and violet are too alike to share a map:
// in a race with both a Democrat and an Independent, the Independent moves to aqua.
const HUES = {
  blue: '#2a78d6',
  red: '#e34948',
  violet: '#6250d6',
  aqua: '#1baf7a',
  yellow: '#eda100',
  orange: '#eb6834',
  magenta: '#e87ba4',
  green: '#008300',
} as const;
type Hue = keyof typeof HUES;

const PARTY_HUES: Record<string, Hue[]> = {
  DEM: ['blue'],
  REP: ['red'],
  IND: ['violet', 'aqua'],
  LIB: ['yellow'],
  CON: ['orange'],
  YES: ['violet'],
  NO: ['orange'],
};
const FALLBACK_HUES: Hue[] = ['aqua', 'yellow', 'magenta', 'green', 'orange', 'violet'];
const CLASHES: [Hue, Hue][] = [['blue', 'violet']];

/** Candidate id -> color. Follows the party, never the vote order, so colors hold steady as counts change. */
export function raceColors(candidates: Candidate[]): Record<string, string> {
  const used: Hue[] = [];
  const clashes = (h: Hue) =>
    used.includes(h) || CLASHES.some(([a, b]) => (h === a && used.includes(b)) || (h === b && used.includes(a)));
  const colors: Record<string, string> = {};
  // Parties with a single conventional color choose first, so Democrats stay blue and Republicans red
  const byClaim = [...candidates].sort((a, b) => (PARTY_HUES[a.party]?.length ?? 9) - (PARTY_HUES[b.party]?.length ?? 9));
  for (const c of byClaim) {
    const hue = [...(PARTY_HUES[c.party] ?? []), ...FALLBACK_HUES].find((h) => !clashes(h)) ?? 'magenta';
    used.push(hue);
    colors[c.id] = HUES[hue];
  }
  return colors;
}

/** Lead over the runner-up, as a share of all votes in the area. Deeper shade = wider lead. */
export const MARGIN_STEPS = [
  { upTo: 0.05, label: '<5', strength: 0.35 },
  { upTo: 0.15, label: '5–15', strength: 0.55 },
  { upTo: 0.3, label: '15–30', strength: 0.78 },
  { upTo: Infinity, label: '30+', strength: 1 },
];

/** Blend a hex color toward white: strength 1 is the full color */
export function tint(hex: string, strength: number): string {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
    return Math.round(255 - (255 - v) * strength).toString(16).padStart(2, '0');
  };
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

export interface Standing {
  total: number;
  ranked: { candidate: Candidate; votes: number; share: number }[];
  /** null when nobody has votes yet or the top two are tied */
  leader: Candidate | null;
  margin: number;
}

export function standing(votes: Record<string, number>, candidates: Candidate[]): Standing {
  const total = candidates.reduce((sum, c) => sum + (votes[c.id] ?? 0), 0);
  const ranked = candidates
    .map((candidate) => ({ candidate, votes: votes[candidate.id] ?? 0, share: total ? (votes[candidate.id] ?? 0) / total : 0 }))
    .sort((a, b) => b.votes - a.votes);
  const tied = ranked.length > 1 && ranked[0].votes === ranked[1].votes;
  return {
    total,
    ranked,
    leader: total && !tied ? ranked[0].candidate : null,
    margin: total ? (ranked[0].votes - (ranked[1]?.votes ?? 0)) / total : 0,
  };
}

const NO_BOUNDARY = '#dedcd3';
const TIED = '#a8a69e';

export const formatVotes = (n: number) => n.toLocaleString('en-US');
export const formatShare = (share: number) => `${(share * 100).toFixed(1)}%`;

/* ─── Legend ─── */

interface LegendProps {
  candidates: Candidate[];
  colors: Record<string, string>;
  showNoBoundary?: boolean;
}

export const ResultsLegend: React.FC<LegendProps> = ({ candidates, colors, showNoBoundary }) => (
  <div className="flex flex-col gap-4 text-sm text-brand-ink/80">
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-ink/60">Leading, by margin (points)</p>
      <table className="mt-2 border-separate border-spacing-[2px] -ml-[2px]">
        <thead>
          <tr>
            <th className="sr-only">Candidate</th>
            {MARGIN_STEPS.map((s) => (
              <th key={s.label} scope="col" className="w-10 whitespace-nowrap text-[11px] font-semibold text-brand-ink/60 tabular-nums">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {candidates.map((c) => (
            <tr key={c.id}>
              <th scope="row" className="sr-only">{c.name}</th>
              {MARGIN_STEPS.map((s) => (
                <td key={s.label} className="h-4 rounded-[3px]" style={{ background: tint(colors[c.id], s.strength) }}></td>
              ))}
              <td className="pl-2 font-semibold text-brand-ink whitespace-nowrap">{c.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <ul className="flex flex-wrap gap-x-6 gap-y-2">
      <li className="flex items-center gap-2">
        <svg className="w-9 h-4 rounded-[3px] ring-1 ring-brand-ink/15" aria-hidden="true">
          <rect width="100%" height="100%" fill="url(#results-hatch-legend)" />
          <defs>
            <pattern id="results-hatch-legend" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="#ffffff" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="#b9b7ae" strokeWidth="2" />
            </pattern>
          </defs>
        </svg>
        No votes reported yet
      </li>
      <li className="flex items-center gap-2">
        <span className="w-9 h-4 rounded-[3px]" style={{ background: TIED }}></span>
        Tied
      </li>
      {showNoBoundary && (
        <li className="flex items-center gap-2">
          <span className="w-9 h-4 rounded-[3px]" style={{ background: NO_BOUNDARY }}></span>
          No precinct boundary (see table)
        </li>
      )}
    </ul>
  </div>
);

/* ─── Tooltip ─── */

export interface MapResult extends AreaResult {
  reporting?: number;
  total?: number;
  reported?: boolean;
}

const Tooltip: React.FC<{ result: MapResult; candidates: Candidate[]; colors: Record<string, string>; noun: string }> = ({
  result,
  candidates,
  colors,
  noun,
}) => {
  const s = standing(result.votes, candidates);
  const progress =
    result.total !== undefined
      ? `${result.reporting} of ${result.total} precincts reporting`
      : result.reported
        ? 'Reported'
        : 'Not reported yet';
  return (
    <>
      <p className="font-bold text-brand-ink leading-tight">
        {result.name}
        {noun === 'county' ? ' County' : ''}
      </p>
      <p className="text-xs text-brand-ink/60">{progress}</p>
      <table className="mt-2 w-full text-[13px]">
        <tbody>
          {s.ranked.map(({ candidate, votes, share }) => (
            <tr key={candidate.id} className={candidate.id === s.leader?.id ? 'font-bold' : ''}>
              <td className="pr-2 py-0.5">
                <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-[-1px]" style={{ background: colors[candidate.id] }}></span>
                {candidate.name}
              </td>
              <td className="pl-2 text-right tabular-nums text-brand-ink/70">{formatVotes(votes)}</td>
              <td className="pl-2 text-right tabular-nums w-14">{s.total ? formatShare(share) : '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

/* ─── Map ─── */

interface ResultsMapProps {
  viewBox: string;
  areas: { id: string; d: string }[];
  /** Drawn beneath the areas; whatever it shows has no precinct boundary */
  outline?: string;
  results: Map<string, MapResult>;
  candidates: Candidate[];
  colors: Record<string, string>;
  /** "county" or "precinct", for the tooltip and the accessible label */
  noun: 'county' | 'precinct';
  label: string;
  onSelect?: (id: string) => void;
  /** Area to outline, e.g. the county picked from the dropdown */
  highlight?: string;
  zoomable?: boolean;
}

type View = [number, number, number, number];

export const ResultsMap: React.FC<ResultsMapProps> = ({
  viewBox,
  areas,
  outline,
  results,
  candidates,
  colors,
  noun,
  label,
  onSelect,
  highlight,
  zoomable,
}) => {
  const hatchId = `hatch-${useId().replace(/:/g, '')}`;
  const full = viewBox.split(' ').map(Number) as View;
  const [view, setView] = useState<View>(full);
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const [pinned, setPinned] = useState<{ id: string; x: number; y: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null);

  const zoom = view[2] < full[2] - 0.5;

  const fillFor = (id: string) => {
    const r = results.get(id);
    if (!r) return NO_BOUNDARY;
    const s = standing(r.votes, candidates);
    if (!s.total) return `url(#${hatchId})`;
    if (!s.leader) return TIED;
    const step = MARGIN_STEPS.find((m) => s.margin < m.upTo) ?? MARGIN_STEPS[MARGIN_STEPS.length - 1];
    return tint(colors[s.leader.id], step.strength);
  };

  const pointIn = (e: React.PointerEvent) => {
    const rect = boxRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  /** Zoom by `factor`, keeping the map point under (cx, cy) in place; defaults to the middle of the view */
  const zoomBy = (factor: number, cx?: number, cy?: number) => {
    setPinned(null);
    setView(([x, y, w, h]) => {
      const nw = Math.min(full[2], Math.max(full[2] / 12, w / factor));
      const nh = (nw / w) * h;
      const px = cx ?? x + w / 2;
      const py = cy ?? y + h / 2;
      return clampView([px - (px - x) * (nw / w), py - (py - y) * (nh / h), nw, nh], full);
    });
  };

  const onDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return;
    const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
    zoomBy(2, pt.x, pt.y);
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!zoom) return;
    drag.current = { x: e.clientX, y: e.clientY, view, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    if (!d.moved) svgRef.current?.setPointerCapture(e.pointerId);
    d.moved = true;
    setHover(null);
    setPinned(null);
    // Screen pixels per map unit; the screen matrix accounts for a drawing letterboxed by the height cap
    const scale = 1 / (svgRef.current?.getScreenCTM()?.a ?? 1);
    setView(clampView([d.view[0] - dx * scale, d.view[1] - dy * scale, d.view[2], d.view[3]], full));
  };

  const endDrag = () => {
    // Let the click that ends a drag know it was a drag, then forget it
    setTimeout(() => (drag.current = null), 0);
  };

  const onAreaClick = (e: React.MouseEvent<SVGPathElement>, id: string) => {
    if (drag.current?.moved) return;
    if (onSelect) return onSelect(id);
    // Precincts have nowhere to go, so a tap pins the tooltip (the only way to see it on touch screens)
    const rect = boxRef.current!.getBoundingClientRect();
    setPinned(pinned?.id === id ? null : { id, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const tip = hover ?? pinned;
  const tipResult = tip && results.get(tip.id);
  const boxWidth = boxRef.current?.clientWidth ?? 0;
  const boxHeight = boxRef.current?.clientHeight ?? 0;
  // Open the tooltip upward in the lower part of the map so it doesn't cover what's below
  const tipPosition = tip
    ? {
        left: Math.max(0, Math.min(tip.x + 14, boxWidth - 256)),
        ...(tip.y > boxHeight * 0.55 ? { bottom: boxHeight - tip.y + 14 } : { top: tip.y + 14 }),
      }
    : {};

  return (
    <div ref={boxRef} className="relative" onPointerLeave={() => setHover(null)}>
      <svg
        ref={svgRef}
        viewBox={view.join(' ')}
        role="img"
        aria-label={label}
        className={`block w-full h-auto max-h-[34rem] select-none ${zoom ? 'cursor-grab active:cursor-grabbing touch-none' : 'touch-manipulation'}`}
        onDoubleClick={zoomable ? onDoubleClick : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <defs>
          <pattern id={hatchId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="#ffffff" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="#b9b7ae" strokeWidth="2" />
          </pattern>
        </defs>
        {outline && <path d={outline} fill={NO_BOUNDARY} stroke="#ffffff" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
        {areas.map((a) => (
          <path
            key={a.id}
            d={a.d}
            fill={fillFor(a.id)}
            stroke="#ffffff"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            className={results.has(a.id) ? 'cursor-pointer' : ''}
            onPointerMove={(e) => e.pointerType === 'mouse' && !drag.current?.moved && setHover({ id: a.id, ...pointIn(e) })}
            onClick={(e) => onAreaClick(e, a.id)}
          />
        ))}
        {/* Redraw the selected and hovered areas on top so their outlines aren't hidden under neighbors */}
        {highlight && (
          <path
            d={areas.find((a) => a.id === highlight)?.d}
            fill="none"
            stroke="#120a3d"
            strokeWidth="3"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        )}
        {tip && (
          <path
            d={areas.find((a) => a.id === tip.id)?.d}
            fill="none"
            stroke="#120a3d"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        )}
      </svg>

      {tip && tipResult && (
        <div
          className="pointer-events-none absolute z-10 w-64 rounded-xl bg-white p-3 shadow-xl shadow-brand-ink/15 ring-1 ring-brand-ink/10"
          style={tipPosition}
        >
          <Tooltip result={tipResult} candidates={candidates} colors={colors} noun={noun} />
        </div>
      )}

      {zoomable && (
        <div className="absolute top-2 right-2 flex flex-col rounded-xl bg-white shadow ring-1 ring-brand-ink/10 overflow-hidden">
          <button type="button" onClick={() => zoomBy(1.6)} aria-label="Zoom in" className="w-10 h-10 grid place-items-center hover:bg-paper">
            <Icon icon={faPlus} />
          </button>
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.6)}
            disabled={!zoom}
            aria-label="Zoom out"
            className="w-10 h-10 grid place-items-center border-t border-brand-ink/10 hover:bg-paper disabled:opacity-30"
          >
            <Icon icon={faMinus} />
          </button>
          <button
            type="button"
            onClick={() => { setPinned(null); setView(full); }}
            disabled={!zoom}
            aria-label="Reset zoom"
            className="w-10 h-10 grid place-items-center border-t border-brand-ink/10 hover:bg-paper disabled:opacity-30"
          >
            <Icon icon={faRotateLeft} />
          </button>
        </div>
      )}
    </div>
  );
};

/** Keep a zoomed view over the map instead of drifting off into empty space */
function clampView([x, y, w, h]: View, [fx, fy, fw, fh]: View): View {
  return [Math.min(Math.max(x, fx), fx + fw - w), Math.min(Math.max(y, fy), fy + fh - h), w, h];
}
