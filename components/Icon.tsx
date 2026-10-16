import React from 'react';
import type { IconDefinition } from '@fortawesome/free-solid-svg-icons';

interface IconProps {
  icon: IconDefinition;
  className?: string;
}

/**
 * Font Awesome icon rendered as inline SVG. Icons ship inside the bundle and the prerendered HTML,
 * so they paint with the page instead of popping in after a CDN stylesheet and webfont load.
 * Sized by font-size (1em tall) and colored by currentColor, like the <i class="fas"> it replaces.
 */
export const Icon: React.FC<IconProps> = ({ icon, className = '' }) => {
  const [width, height, , , path] = icon.icon;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: `${width / height}em` }}
      className={`inline-block h-[1em] overflow-visible align-[-0.125em] fill-current ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <path d={Array.isArray(path) ? path.join(' ') : path} />
    </svg>
  );
};
