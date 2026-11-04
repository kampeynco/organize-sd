import React from 'react';
import { tint } from './ResultsMap';

// One-hue map shading for a share (a party's share of voters, turnout): lightest for the lowest fifth of areas,
// full color for the highest. Used by the registration and turnout maps.

export interface Bins {
  /** Ascending cut points; an area falls in the first bin whose cut is above its share */
  cuts: number[];
  /** Whole points, or tenths for small shares */
  decimals: number;
}

/** Cut points that put about a fifth of the areas in each shade, rounded so the legend reads cleanly */
export function shareBins(shares: number[]): Bins {
  const sorted = [...shares].sort((a, b) => a - b);
  if (!sorted.length) return { cuts: [], decimals: 0 };
  const decimals = sorted[sorted.length - 1] < 0.1 ? 1 : 0;
  const unit = decimals ? 0.001 : 0.01;
  const raw = [1, 2, 3, 4].map((i) => Math.round(sorted[Math.floor((i * sorted.length) / 5)] / unit) * unit);
  const cuts = [...new Set(raw.map((c) => +c.toFixed(4)))].filter((c) => c > sorted[0]).sort((a, b) => a - b);
  return { cuts, decimals };
}

export const binOf = (share: number, bins: Bins) => {
  const i = bins.cuts.findIndex((c) => share < c);
  return i === -1 ? bins.cuts.length : i;
};

/** Lightest to full color, evenly spaced, however many bins there are */
export const strengthOf = (bin: number, count: number) => (count <= 1 ? 1 : 0.3 + (0.7 * bin) / (count - 1));

/** The shade for a share */
export const binColor = (color: string, share: number, bins: Bins) =>
  tint(color, strengthOf(binOf(share, bins), bins.cuts.length + 1));

const pct = (share: number, decimals: number) => `${(share * 100).toFixed(decimals)}`;

function binLabels(bins: Bins): string[] {
  const { cuts, decimals } = bins;
  if (!cuts.length) return ['All'];
  return [
    `<${pct(cuts[0], decimals)}%`,
    ...cuts.slice(1).map((c, i) => `${pct(cuts[i], decimals)}–${pct(c, decimals)}%`),
    `${pct(cuts[cuts.length - 1], decimals)}%+`,
  ];
}

export const BinLegend: React.FC<{ title: string; color: string; bins: Bins; plural: string }> = ({ title, color, bins, plural }) => {
  const labels = binLabels(bins);
  return (
    <div className="text-sm text-brand-ink/80">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-ink/60">{title}</p>
      <ul className="mt-2 flex flex-wrap gap-[2px]">
        {labels.map((label, i) => (
          <li key={label} className="w-16">
            <span className="block h-4 rounded-[3px]" style={{ background: tint(color, strengthOf(i, labels.length)) }}></span>
            <span className="mt-1 block text-[11px] font-semibold text-brand-ink/70 tabular-nums">{label}</span>
          </li>
        ))}
      </ul>
      {labels.length > 1 && (
        <p className="mt-2 text-xs text-brand-ink/60">Each shade holds about {labels.length === 5 ? 'a fifth' : 'an equal share'} of the {plural}.</p>
      )}
    </div>
  );
};
