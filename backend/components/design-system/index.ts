/**
 * Windows 98 Design System
 * 
 * Complete design system for Windows 98 themed UI components.
 * Provides type-safe design tokens, component interfaces, and utilities.
 * 
 * @fileoverview Central design system with TypeScript-first approach
 * @version 2.0.0
 */

// =============================================================================
// CORE DESIGN TOKENS
// =============================================================================

/**
 * Windows 98 Color Palette
 * Based on authentic Windows 98 system colors
 */
export const colors = {
  // System Colors - Updated to Windows 2000/NT style
  background: '#3B6EA5',           // Windows 2000 desktop blue (was #C0C0C0)
  surface: '#ECE9D8',              // Warm beige-gray for content (was #FFFFFF)
  surfaceElevated: '#D4D0C8',      // Softer panel color (was #DFDFDF)
  
  // Border Colors (3D effects) - Softer for NT style
  borderLight: '#FFFFFF',          // Top/left highlight for 3D effect
  borderDark: '#404040',           // Softer shadow (was #000000)
  borderMedium: '#808080',         // Medium shadow for panels (was #404040)
  
  // Accent Colors - NT style gradients
  primary: '#0A246A',              // Darker blue for gradient start (was #000080)
  primaryLight: '#A6CAF0',         // Light blue for gradient end (new)
  primaryText: '#FFFFFF',          // Text on primary background
  error: '#800000',                // Windows error red (unchanged)
  
  // Text Colors - Slightly softer
  textPrimary: '#333333',          // Medium gray for Windows 2000 feel
  textSecondary: '#5A5A5A',        // Lighter secondary text
  textDisabled: '#999999',         // Lighter disabled text
  
  // Interactive States - Warmer tones
  hover: '#E4E2DC',               // Warmer hover state (was #E0E0E0)
  pressed: '#B8B5A6',             // Warmer pressed state (was #A0A0A0)
  selected: '#316AC5',            // Windows 2000 selection blue (was #000080)
  selectedText: '#FFFFFF',        // Text on selected background
  link: '#316AC5',                // Link color (same as selected for consistency)
  
  // Additional NT-specific colors
  menuBar: '#D4D0C8',             // Menu bar background
  windowFrame: '#0A246A',         // Window frame color
  inactiveTitle: '#7A96DF',       // Inactive title bar
} as const;

/**
 * Provider-specific brand colors
 * Consistent across charts and data visualization
 */
export const providerColors = {
  anthropic: '#C07C62',
  azure: '#0078D4',
  anyscale: '#143566',
  openai: '#1F1F1F',
  bedrock: '#FF9900',
  mistral: '#FD6F00',
  groq: '#D46645',
  together: '#0E6EFF',
  perplexity: '#1B818E',
  fireworks: '#C02390',
  lepton: '#467EE5',
  deepinfra: '#5798DC',
  nvidia: '#85B737',
  runpod: '#673AB7',
  google: '#33a852',
  lambda: '#4027ff',
  openrouter: '#8B5CF6',
  vertex: '#4285F4',
} as const;

/**
 * Typography Scale
 * Windows 98 authentic font sizing and weights
 */
export const typography = {
  fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
  
  // Font Sizes (rem units)
  sizes: {
    xs: '0.625rem',    // 10px - Small captions
    sm: '0.6875rem',   // 11px - Small text
    base: '0.75rem',   // 12px - Default Windows 98 text
    md: '0.875rem',    // 14px - Medium text
    lg: '1rem',        // 16px - Large text
    xl: '1.125rem',    // 18px - Headings level 3
    '2xl': '1.25rem',  // 20px - Headings level 2
    '3xl': '1.5rem',   // 24px - Headings level 1
  },
  
  // Font Weights
  weights: {
    normal: 400,
    semibold: 600,
  },
  
  // Line Heights
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
} as const;

/**
 * Spacing Scale
 * Based on 4px grid system (Windows 98 standard)
 */
export const spacing = {
  unit: 4,
  scale: {
    0: 0,
    1: 4,    // 1 × 4px
    2: 8,    // 2 × 4px
    3: 12,   // 3 × 4px
    4: 16,   // 4 × 4px
    6: 24,   // 6 × 4px
    8: 32,   // 8 × 4px
    12: 48,  // 12 × 4px
    16: 64,  // 16 × 4px
    20: 80,  // 20 × 4px
    24: 96,  // 24 × 4px
  },
} as const;

/**
 * Responsive Breakpoints
 * Mobile-first approach with Windows 98 desktop optimization
 */
export const breakpoints = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
} as const;

/**
 * Component Sizing Standards
 */
export const sizing = {
  // Button heights
  buttonHeight: {
    sm: 20,
    md: 24,
    lg: 32,
  },
  
  // Title bar height
  titleBarHeight: 18,
  
  // Border widths
  borderWidth: {
    thin: 1,
    medium: 2,
    thick: 3,
  },
  
  // Shadow values
  shadows: {
    none: 'none',
    sm: '1px 1px 2px rgba(0, 0, 0, 0.2)',
    md: '2px 2px 4px rgba(0, 0, 0, 0.3)',
    lg: '4px 4px 8px rgba(0, 0, 0, 0.4)',
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

/**
 * Color palette type for IntelliSense support
 */
export type ColorName = keyof typeof colors;
export type ProviderName = keyof typeof providerColors;
export type TypographySize = keyof typeof typography.sizes;
export type SpacingScale = keyof typeof spacing.scale;
export type BreakpointName = keyof typeof breakpoints;

/**
 * Common component props interface
 */
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

/**
 * Responsive component props
 */
export interface ResponsiveProps {
  isMobile?: boolean;
}

/**
 * Windows 98 window component props
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

/**
 * Button variant types
 */
export type ButtonVariant = 'default' | 'primary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Button component props
 */
export interface ButtonProps extends BaseComponentProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * Layout component props
 */
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
  return providerColors[provider as ProviderName] || colors.primary;
}

/**
 * Get spacing value with type safety
 */
export function getSpacing(scale: SpacingScale): number {
  return spacing.scale[scale];
}

/**
 * Get typography size with type safety
 */
export function getTypographySize(size: TypographySize): string {
  return typography.sizes[size];
}

/**
 * Create responsive breakpoint helper
 */
export function createBreakpoint(breakpoint: BreakpointName): string {
  return `${breakpoints[breakpoint]}px`;
}

/**
 * Creates Windows 2000 style gradient for title bars
 * @param startColor - Start color (default: primary)
 * @param endColor - End color (default: primaryLight)
 * @param direction - Gradient direction (default: 'vertical')
 */
export function createTitleBarGradient(
  startColor: string = colors.primary,
  endColor: string = colors.primaryLight,
  direction: 'vertical' | 'horizontal' = 'vertical'
): string {
  const dir = direction === 'vertical' ? 'to bottom' : 'to right';
  return `linear-gradient(${dir}, ${startColor} 0%, ${endColor} 100%)`;
}

/**
 * Generate Windows 98 3D border styles
 */
export function create3DBorder(inset: boolean = false): string {
  const lightColor = colors.borderLight;
  const darkColor = colors.borderDark;
  
  if (inset) {
    return `
      border-top: 2px solid ${darkColor};
      border-left: 2px solid ${darkColor};
      border-bottom: 2px solid ${lightColor};
      border-right: 2px solid ${lightColor};
    `;
  } else {
    return `
      border-top: 2px solid ${lightColor};
      border-left: 2px solid ${lightColor};
      border-bottom: 2px solid ${darkColor};
      border-right: 2px solid ${darkColor};
    `;
  }
}

/**
 * Generate Windows 98 button styles
 */
export function createButtonStyles(variant: ButtonVariant = 'default', pressed: boolean = false) {
  const baseStyles = {
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.normal,
    padding: `${spacing.scale[1]}px ${spacing.scale[4]}px`,
    minHeight: `${sizing.buttonHeight.md}px`,
    cursor: 'pointer',
    userSelect: 'none' as const,
    textAlign: 'center' as const,
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: `${spacing.scale[1]}px`,
    transition: 'none', // Windows 98 had no transitions
  };

  const variantStyles = {
    default: {
      backgroundColor: colors.surfaceElevated,
      color: colors.textPrimary,
      ...(!pressed && { border: `2px outset ${colors.surfaceElevated}` }),
      ...(pressed && { border: `2px inset ${colors.surfaceElevated}` }),
    },
    primary: {
      backgroundColor: colors.primary,
      color: colors.primaryText,
      ...(!pressed && { border: `2px outset ${colors.primary}` }),
      ...(pressed && { border: `2px inset ${colors.primary}` }),
    },
    outline: {
      backgroundColor: 'transparent',
      color: colors.textPrimary,
      border: `1px solid ${colors.borderMedium}`,
    },
    ghost: {
      backgroundColor: 'transparent',
      color: colors.textPrimary,
      border: 'none',
      '&:hover': {
        backgroundColor: colors.hover,
      },
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

/**
 * Complete theme object for Material-UI integration
 */
export const designSystemTheme = {
  colors,
  providerColors,
  typography,
  spacing,
  breakpoints,
  sizing,
  // Utility functions
  getProviderColor,
  getSpacing,
  getTypographySize,
  createBreakpoint,
  create3DBorder,
  createButtonStyles,
} as const;

/**
 * Type for the complete design system
 */
export type DesignSystemTheme = typeof designSystemTheme;

// Default export for easy importing
export default designSystemTheme;