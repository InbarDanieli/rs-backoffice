/**
 * Design System — Token References
 *
 * TypeScript mirror of the CSS custom properties defined in globals.css.
 * Use these when you need token values in JS (e.g. inline styles, SVG attrs).
 * For everything else, reference the CSS vars directly: var(--color-bg)
 */

export const colors = {
  bg: "var(--color-bg)",
  surface: "var(--color-surface)",
  surfaceHover: "var(--color-surface-hover)",
  border: "var(--color-border)",
  borderStrong: "var(--color-border-strong)",
  gridLine: "var(--color-grid-line)",

  textPrimary: "var(--color-text-primary)",
  textSecondary: "var(--color-text-secondary)",
  textMuted: "var(--color-text-muted)",
  textInverse: "var(--color-text-inverse)",

  accent: "var(--color-accent)",
  accentHover: "var(--color-accent-hover)",
  accentFg: "var(--color-accent-fg)",
} as const;

export const text = {
  xs: "var(--text-xs)",
  sm: "var(--text-sm)",
  base: "var(--text-base)",
  md: "var(--text-md)",
  lg: "var(--text-lg)",
  xl: "var(--text-xl)",
  "2xl": "var(--text-2xl)",
  "3xl": "var(--text-3xl)",
} as const;

export const weight = {
  normal: "var(--weight-normal)",
  medium: "var(--weight-medium)",
  semibold: "var(--weight-semibold)",
  bold: "var(--weight-bold)",
} as const;

export const space = {
  1: "var(--space-1)",
  2: "var(--space-2)",
  3: "var(--space-3)",
  4: "var(--space-4)",
  5: "var(--space-5)",
  6: "var(--space-6)",
  8: "var(--space-8)",
  10: "var(--space-10)",
  12: "var(--space-12)",
  16: "var(--space-16)",
  20: "var(--space-20)",
} as const;

export const radius = {
  sm: "var(--radius-sm)",
  md: "var(--radius-md)",
  lg: "var(--radius-lg)",
  xl: "var(--radius-xl)",
  "2xl": "var(--radius-2xl)",
  full: "var(--radius-full)",
} as const;

export const shadow = {
  sm: "var(--shadow-sm)",
  md: "var(--shadow-md)",
  lg: "var(--shadow-lg)",
  xl: "var(--shadow-xl)",
} as const;

export const duration = {
  fast: "var(--duration-fast)",
  base: "var(--duration-base)",
  slow: "var(--duration-slow)",
} as const;
