
import React from 'react';

interface LogoProps {
  className?: string;
  /** Rendered width hint for the browser's srcset choice, e.g. "96px" */
  sizes?: string;
  priority?: boolean;
}

/** Organize SD logo (South Dakota outline + megaphone), generated from assets/logo-4K.png */
export const Logo: React.FC<LogoProps> = ({ className = '', sizes = '160px', priority = false }) => (
  <img
    src="/brand/logo-320.webp"
    srcSet="/brand/logo-160.webp 160w, /brand/logo-320.webp 320w, /brand/logo-480.webp 480w, /brand/logo-640.webp 640w"
    sizes={sizes}
    width={1687}
    height={1000}
    alt="Organize SD"
    decoding="async"
    fetchPriority={priority ? 'high' : 'auto'}
    loading={priority ? 'eager' : 'lazy'}
    className={`w-auto select-none ${className}`}
    draggable={false}
  />
);
