/**
 * Console design system.
 *
 * The site is a measuring instrument, so the tokens are built around measured
 * values: a near-black neutral ground, one accent that marks numbers and
 * nothing else, three semantic colours for health state, and a monospace with
 * tabular figures set larger than the prose around it.
 *
 * Colour vocabulary is ground / surface / raised / rule / text / accent /
 * semantic. The Windows 98 names (`surfaceElevated`, `borderDark`,
 * `primaryText`, …) survive as aliases at the bottom of `colors` so the whole
 * site follows a token change instead of needing a simultaneous rewrite. Prefer
 * the semantic names in new code.
 *
 * Every text colour here clears WCAG AA (4.5:1) against ground, surface, raised
 * and the table zebra stripe. `tests/contrast-checker.js` is the guard.
 */

// =============================================================================
// CORE DESIGN TOKENS
// =============================================================================

/**
 * Console palette. Cool neutral, not navy, not slate, not warm.
 */
export const colors = {
  // Ground and panels — each step is one level up from the page background.
  ground: '#0C0D0F',
  surface: '#101215',
  raised: '#16181C',
  zebra: '#0F1113',              // alternating table row, one hair off ground

  // Rules. Hairlines only; the design has no boxes with heavy borders.
  rule: '#212429',
  ruleSoft: '#181A1E',           // between table rows, where a full rule is loud

  // Text. Three steps, all AA against every background above.
  text: '#DFE3E8',
  textDim: '#9AA3AD',
  textMute: '#7A828C',

  // The single accent. Marks measured values and active controls only.
  accent: '#7DD3C0',
  accentInk: '#0C0D0F',          // text on an accent fill

  // Health state. These three and no others.
  ok: '#5FD08A',
  warn: '#E5B95C',
  bad: '#F08573',

  // ---------------------------------------------------------------------------
  // Aliases for the Win98 vocabulary. Kept so existing components resolve to the
  // new palette without a simultaneous rewrite; do not use in new code.
  // ---------------------------------------------------------------------------
  background: '#0C0D0F',         // was desktop blue
  surfaceElevated: '#16181C',    // was beige panel
  borderLight: '#212429',
  borderDark: '#212429',
  borderMedium: '#212429',
  primary: '#7DD3C0',
  primaryLight: '#7DD3C0',
  primaryText: '#0C0D0F',
  error: '#F08573',
  textPrimary: '#DFE3E8',
  textSecondary: '#9AA3AD',
  textDisabled: '#7A828C',
  hover: '#16181C',
  pressed: '#212429',
  selected: '#7DD3C0',
  selectedText: '#0C0D0F',
  link: '#7DD3C0',
  menuBar: '#101215',
  windowFrame: '#212429',
  inactiveTitle: '#7A828C',
} as const;

/**
 * Ordered categorical ramp for chart series.
 *
 * Series colour is assigned per view from this ramp, not per provider forever.
 * The 19-colour provider rainbow is retired: provider identity is a monochrome
 * label plus a rule, which leaves colour free to carry the thing being compared
 * in the chart actually on screen.
 *
 * Ordered by hue distance so adjacent entries stay separable, and every entry
 * clears 4.5:1 on `colors.ground`.
 */
export const seriesRamp = [
  '#7DD3C0',
  '#E5B95C',
  '#8FB8F0',
  '#D89AD4',
  '#7FD1E8',
  '#C6CF7A',
  '#F0A184',
  '#A6AEF2',
  '#6FCFA6',
  '#E8B0A0',
] as const;

/**
 * Provider marks.
 *
 * Retained only where a chart genuinely needs a stable per-provider stroke
 * across views. Everything else uses `seriesRamp`. These are the neutral marks:
 * a provider is identified by its label, not by a brand colour.
 */
export const providerColors = {
  anthropic: '#7DD3C0',
  azure: '#8FB8F0',
  anyscale: '#A6AEF2',
  openai: '#DFE3E8',
  bedrock: '#E5B95C',
  mistral: '#F0A184',
  groq: '#E8B0A0',
  together: '#8FB8F0',
  perplexity: '#7FD1E8',
  fireworks: '#D89AD4',
  lepton: '#A6AEF2',
  deepinfra: '#7FD1E8',
  nvidia: '#C6CF7A',
  runpod: '#D89AD4',
  google: '#6FCFA6',
  lambda: '#A6AEF2',
  openrouter: '#D89AD4',
  vertex: '#8FB8F0',
  cerebras: '#F0A184',
} as const;

/**
 * Typography.
 *
 * Two families. The mono carries every measured value and every micro-label;
 * the sans carries model names and the little prose that survives. Base is
 * 13px rather than the old 12px, and measured values are set above it.
 */
export const typography = {
  // next/font injects the real families as CSS variables in `_app.tsx`; the
  // literal names are the fallback when a page renders before that resolves.
  fontFamily: 'var(--font-sans), "IBM Plex Sans", system-ui, -apple-system, sans-serif',
  monoFamily: 'var(--font-mono), "IBM Plex Mono", ui-monospace, SFMono-Regular, monospace',

  sizes: {
    micro: '0.5625rem',  // 9px  — all-caps rail labels, axis ticks
    xs: '0.625rem',      // 10px — column heads, provider tags
    sm: '0.6875rem',     // 11px — dense table cells
    base: '0.8125rem',   // 13px — body
    md: '0.875rem',      // 14px — model names, small-multiple values
    lg: '1.125rem',      // 18px — meter-strip values
    xl: '1.375rem',      // 22px — section figures
    '2xl': '1.75rem',    // 28px — page-level figures
    '3xl': '2.25rem',    // 36px
  },

  weights: {
    normal: 400,
    medium: 500,
    semibold: 600,
  },

  lineHeights: {
    tight: 1.15,
    normal: 1.45,
    relaxed: 1.6,
  },

  /** Letter-spacing for the all-caps micro labels that head every block. */
  tracking: {
    label: '0.1em',
    tag: '0.08em',
    figure: '-0.03em',
  },
} as const;

/**
 * Numeric styling for any measured value. Tabular figures keep columns aligned
 * when digits change between renders.
 */
export const numeric = {
  fontFamily: typography.monoFamily,
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: '"tnum" 1',
} as const;

/**
 * Spacing on a 4px grid.
 */
export const spacing = {
  unit: 4,
  scale: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    12: 48,
    16: 64,
    20: 80,
    24: 96,
  },
} as const;

/**
 * Responsive breakpoints.
 */
export const breakpoints = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
} as const;

/**
 * Component sizing. The chrome is hairlines and short rows; nothing here is
 * thicker than 1px on purpose.
 */
export const sizing = {
  buttonHeight: {
    sm: 20,
    md: 24,
    lg: 30,
  },

  /** Height of the top bar and of a section header rail. */
  navHeight: 40,
  sectionHeaderHeight: 30,

  borderWidth: {
    thin: 1,
    medium: 1,
    thick: 2,
  },

  /** Flat surfaces. Depth is carried by the ground/surface/raised steps. */
  shadows: {
    none: 'none',
    sm: 'none',
    md: 'none',
    lg: 'none',
  },
} as const;

// =============================================================================
// TYPESCRIPT INTERFACES
// =============================================================================

/**
 * Provider enum for type safety
 */
export enum Provider {
  Anthropic = "anthropic",
  Azure = "azure",
  Anyscale = "anyscale",
  OpenAI = "openai",
  Bedrock = "bedrock",
  Mistral = "mistral",
  Groq = "groq",
  Cerebras = "cerebras",
  Together = "together",
  Perplexity = "perplexity",
  Fireworks = "fireworks",
  Lepton = "lepton",
  Deepinfra = "deepinfra",
  Nvidia = "nvidia",
  Runpod = "runpod",
  Google = "google",
  Lambda = "lambda",
  OpenRouter = "openrouter",
  Vertex = "vertex",
}

export type ColorName = keyof typeof colors;
export type ProviderName = keyof typeof providerColors;
export type TypographySize = keyof typeof typography.sizes;
export type SpacingScale = keyof typeof spacing.scale;
export type BreakpointName = keyof typeof breakpoints;

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ResponsiveProps {
  isMobile?: boolean;
}

/**
 * Panel component props. `title` renders into the section header rail.
 */
export interface WindowProps extends BaseComponentProps, ResponsiveProps {
  title?: string;
  minimizable?: boolean;
  maximizable?: boolean;
  closable?: boolean;
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose?: () => void;
}

export type ButtonVariant = 'default' | 'primary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends BaseComponentProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
}

export interface LayoutProps extends BaseComponentProps, ResponsiveProps {
  direction?: 'row' | 'column';
  gap?: SpacingScale;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get provider color with type safety
 */
export function getProviderColor(provider: Provider): string {
  return providerColors[provider as ProviderName] || colors.accent;
}

/**
 * Nth colour of the categorical ramp, wrapping past the end.
 */
export function seriesColor(index: number): string {
  return seriesRamp[((index % seriesRamp.length) + seriesRamp.length) % seriesRamp.length];
}

export function getSpacing(scale: SpacingScale): number {
  return spacing.scale[scale];
}

export function getTypographySize(size: TypographySize): string {
  return typography.sizes[size];
}

export function createBreakpoint(breakpoint: BreakpointName): string {
  return `${breakpoints[breakpoint]}px`;
}

/**
 * The all-caps micro label that heads every block. Small, tracked out, dim —
 * it names the block without competing with the numbers inside it.
 */
export function microLabel() {
  return {
    fontFamily: typography.monoFamily,
    fontSize: typography.sizes.micro,
    letterSpacing: typography.tracking.label,
    textTransform: 'uppercase' as const,
    color: colors.textMute,
  };
}

/**
 * A measured value. Mono, tabular, tight, and one step brighter than its label.
 */
export function figure(size: TypographySize = 'lg') {
  return {
    ...numeric,
    fontSize: typography.sizes[size],
    fontWeight: typography.weights.medium,
    letterSpacing: typography.tracking.figure,
    lineHeight: typography.lineHeights.tight,
    color: colors.text,
  };
}

/**
 * Hairline rule on a given edge. Replaces the old bevelled 3D borders — the
 * design separates blocks with a single 1px line and a background step.
 */
export function hairline(side: 'top' | 'right' | 'bottom' | 'left' | 'all' = 'bottom'): string {
  const rule = `1px solid ${colors.rule}`;
  if (side === 'all') return `border: ${rule};`;
  const edge = side.charAt(0).toUpperCase() + side.slice(1);
  return `border-${edge.toLowerCase()}: ${rule};`;
}

/**
 * Control styles. Small flat rectangles; the pressed state fills with the
 * accent rather than inverting a bevel.
 */
export function createButtonStyles(variant: ButtonVariant = 'default', pressed: boolean = false) {
  const baseStyles = {
    fontFamily: typography.monoFamily,
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.normal,
    letterSpacing: typography.tracking.tag,
    textTransform: 'uppercase' as const,
    padding: `${spacing.scale[1]}px ${spacing.scale[2]}px`,
    minHeight: `${sizing.buttonHeight.sm}px`,
    borderRadius: 0,
    cursor: 'pointer',
    userSelect: 'none' as const,
    textAlign: 'center' as const,
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: `${spacing.scale[1]}px`,
    transition: 'color 80ms linear, background-color 80ms linear',
  };

  const variantStyles = {
    default: pressed
      ? {
          backgroundColor: colors.accent,
          color: colors.accentInk,
          border: `1px solid ${colors.accent}`,
        }
      : {
          backgroundColor: colors.raised,
          color: colors.textMute,
          border: `1px solid ${colors.rule}`,
          '&:hover': { color: colors.text },
        },
    primary: {
      backgroundColor: colors.accent,
      color: colors.accentInk,
      border: `1px solid ${colors.accent}`,
    },
    outline: {
      backgroundColor: 'transparent',
      color: colors.textDim,
      border: `1px solid ${colors.rule}`,
      '&:hover': { color: colors.text },
    },
    ghost: {
      backgroundColor: 'transparent',
      color: colors.textDim,
      border: '1px solid transparent',
      '&:hover': { color: colors.text },
    },
  };

  return {
    ...baseStyles,
    ...variantStyles[variant],
  };
}

// =============================================================================
// THEME CONSTANTS
// =============================================================================

export const designSystemTheme = {
  colors,
  providerColors,
  seriesRamp,
  typography,
  numeric,
  spacing,
  breakpoints,
  sizing,
  getProviderColor,
  seriesColor,
  getSpacing,
  getTypographySize,
  createBreakpoint,
  microLabel,
  figure,
  hairline,
  createButtonStyles,
} as const;

export type DesignSystemTheme = typeof designSystemTheme;

export default designSystemTheme;
