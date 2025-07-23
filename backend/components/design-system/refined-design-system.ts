/**
 * Refined Design System
 * 
 * A modern interpretation of classic UI principles, focusing on clarity,
 * contrast, and functional elegance. Inspired by Jony Ive's design philosophy
 * of simplicity with purpose.
 * 
 * @fileoverview Modern design system with refined contrast approach
 * @version 3.0.0
 */

// =============================================================================
// DESIGN PRINCIPLES
// =============================================================================
/**
 * 1. CLARITY: Every element should have a clear purpose
 * 2. CONTRAST: Use contrast functionally, not decoratively
 * 3. CONSISTENCY: Systematic approach to spacing, sizing, and color
 * 4. CONTENT-FIRST: Let content breathe, minimize chrome
 * 5. PERFORMANCE: Visual design should enhance, not hinder, speed perception
 */

// =============================================================================
// COLOR SYSTEM - Refined Greys with Purpose
// =============================================================================

export const refinedColors = {
  // Base Palette - A sophisticated grey scale
  neutral: {
    50: '#FAFAFA',   // Near white - for highlights
    100: '#F5F5F5',  // Light backgrounds
    200: '#EEEEEE',  // Elevated surfaces
    300: '#E0E0E0',  // Borders, dividers
    400: '#BDBDBD',  // Disabled states
    500: '#9E9E9E',  // Secondary text
    600: '#757575',  // Icons, tertiary elements
    700: '#616161',  // Primary text
    800: '#424242',  // Emphasis text
    900: '#212121',  // Maximum contrast
  },
  
  // Functional Colors - Minimal but purposeful
  primary: {
    main: '#2962FF',     // Refined blue - for primary actions
    light: '#5393FF',    // Hover states
    dark: '#0039CB',     // Active states
    contrast: '#FFFFFF', // Text on primary
  },
  
  // Semantic Colors - Clear communication
  semantic: {
    success: '#00C853',  // Green - positive metrics
    warning: '#FFB300',  // Amber - attention needed
    error: '#D50000',    // Red - errors/issues
    info: '#00B0FF',     // Light blue - informational
  },
  
  // Background System - Subtle depth without skeuomorphism
  background: {
    primary: '#FAFAFA',   // Main background
    secondary: '#F5F5F5', // Section backgrounds
    elevated: '#FFFFFF',  // Cards, modals
    recessed: '#EEEEEE',  // Input fields, wells
  },
  
  // Text Hierarchy - Clear and purposeful
  text: {
    primary: 'rgba(0, 0, 0, 0.87)',   // Primary content
    secondary: 'rgba(0, 0, 0, 0.60)', // Supporting content
    disabled: 'rgba(0, 0, 0, 0.38)',  // Disabled state
    hint: 'rgba(0, 0, 0, 0.38)',      // Placeholder text
  },
  
  // Interaction States - Subtle feedback
  interaction: {
    hover: 'rgba(0, 0, 0, 0.04)',
    pressed: 'rgba(0, 0, 0, 0.08)',
    selected: 'rgba(41, 98, 255, 0.08)',
    focus: 'rgba(41, 98, 255, 0.12)',
  },
} as const;

// =============================================================================
// REFINED PROVIDER COLORS - Data Visualization
// =============================================================================

export const refinedProviderColors = {
  // Using a more sophisticated, accessible color palette
  anthropic: '#8B5CF6',   // Purple
  openai: '#10B981',      // Emerald
  azure: '#3B82F6',       // Blue
  google: '#F59E0B',      // Amber
  mistral: '#EF4444',     // Red
  bedrock: '#F97316',     // Orange
  groq: '#8B5CF6',        // Violet
  together: '#6366F1',    // Indigo
  perplexity: '#14B8A6',  // Teal
  fireworks: '#EC4899',   // Pink
  lepton: '#3B82F6',      // Sky
  deepinfra: '#6366F1',   // Indigo
  nvidia: '#84CC16',      // Lime
  runpod: '#A855F7',      // Purple
  lambda: '#8B5CF6',      // Violet
  anyscale: '#6B7280',    // Gray
} as const;

// =============================================================================
// TYPOGRAPHY - Clean and Readable
// =============================================================================

export const refinedTypography = {
  // System font stack for optimal rendering
  fontFamily: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  },
  
  // Modular scale - 1.250 ratio (Major Third)
  scale: {
    xs: '0.75rem',     // 12px - Captions
    sm: '0.875rem',    // 14px - Small text
    base: '1rem',      // 16px - Body text
    md: '1.125rem',    // 18px - Emphasis
    lg: '1.25rem',     // 20px - Section headers
    xl: '1.5rem',      // 24px - Page headers
    '2xl': '1.875rem', // 30px - Large headers
    '3xl': '2.25rem',  // 36px - Hero text
  },
  
  // Font weights - Limited for clarity
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
  },
  
  // Line heights - Optimized for readability
  lineHeight: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  
  // Letter spacing - Subtle refinements
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
  },
} as const;

// =============================================================================
// SPACING SYSTEM - Consistent Rhythm
// =============================================================================

export const refinedSpacing = {
  // Base unit: 4px - allows fine control
  unit: 4,
  
  // Fibonacci-inspired scale for natural rhythm
  scale: {
    0: 0,      // 0px
    1: 4,      // 4px
    2: 8,      // 8px
    3: 12,     // 12px
    4: 16,     // 16px
    5: 20,     // 20px
    6: 24,     // 24px
    8: 32,     // 32px
    10: 40,    // 40px
    12: 48,    // 48px
    16: 64,    // 64px
    20: 80,    // 80px
    24: 96,    // 96px
    32: 128,   // 128px
  },
  
  // Component-specific spacing
  component: {
    paddingX: 16,     // Horizontal padding
    paddingY: 12,     // Vertical padding
    gap: 8,           // Space between elements
    sectionGap: 32,   // Space between sections
  },
} as const;

// =============================================================================
// ELEVATION SYSTEM - Subtle Depth
// =============================================================================

export const refinedElevation = {
  // Modern shadow system - subtle and functional
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  
  // Z-index scale
  zIndex: {
    base: 0,
    elevated: 1,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
  },
} as const;

// =============================================================================
// ANIMATION SYSTEM - Smooth and Purposeful
// =============================================================================

export const refinedAnimation = {
  // Duration scale
  duration: {
    instant: '0ms',
    fast: '150ms',
    base: '250ms',
    slow: '350ms',
    slower: '500ms',
  },
  
  // Easing functions
  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
} as const;

// =============================================================================
// COMPONENT PATTERNS - Modern Best Practices
// =============================================================================

export const refinedPatterns = {
  // Border radius - Subtle softness
  radius: {
    none: '0',
    sm: '2px',
    base: '4px',
    md: '6px',
    lg: '8px',
    full: '9999px',
  },
  
  // Border widths
  borderWidth: {
    none: '0',
    thin: '1px',
    base: '2px',
  },
  
  // Opacity scale
  opacity: {
    0: '0',
    5: '0.05',
    10: '0.1',
    20: '0.2',
    40: '0.4',
    60: '0.6',
    80: '0.8',
    100: '1',
  },
} as const;

// =============================================================================
// RESPONSIVE SYSTEM
// =============================================================================

export const refinedBreakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a refined button style without heavy borders
 */
export const createRefinedButton = (variant: 'primary' | 'secondary' | 'ghost' = 'secondary') => {
  const variants = {
    primary: {
      backgroundColor: refinedColors.primary.main,
      color: refinedColors.primary.contrast,
      border: 'none',
      '&:hover': {
        backgroundColor: refinedColors.primary.light,
      },
      '&:active': {
        backgroundColor: refinedColors.primary.dark,
      },
    },
    secondary: {
      backgroundColor: refinedColors.background.elevated,
      color: refinedColors.text.primary,
      border: `1px solid ${refinedColors.neutral[300]}`,
      '&:hover': {
        backgroundColor: refinedColors.neutral[100],
        borderColor: refinedColors.neutral[400],
      },
      '&:active': {
        backgroundColor: refinedColors.neutral[200],
      },
    },
    ghost: {
      backgroundColor: 'transparent',
      color: refinedColors.text.primary,
      border: 'none',
      '&:hover': {
        backgroundColor: refinedColors.interaction.hover,
      },
      '&:active': {
        backgroundColor: refinedColors.interaction.pressed,
      },
    },
  };
  
  return {
    ...variants[variant],
    fontFamily: refinedTypography.fontFamily.sans,
    fontSize: refinedTypography.scale.base,
    fontWeight: refinedTypography.weight.medium,
    padding: `${refinedSpacing.scale[2]}px ${refinedSpacing.scale[4]}px`,
    borderRadius: refinedPatterns.radius.base,
    transition: `all ${refinedAnimation.duration.fast} ${refinedAnimation.easing.inOut}`,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: refinedSpacing.scale[2],
    outline: 'none',
    '&:focus-visible': {
      boxShadow: `0 0 0 2px ${refinedColors.primary.main}`,
    },
    '&:disabled': {
      opacity: refinedPatterns.opacity[40],
      cursor: 'not-allowed',
    },
  };
};

/**
 * Create a refined card style
 */
export const createRefinedCard = () => ({
  backgroundColor: refinedColors.background.elevated,
  borderRadius: refinedPatterns.radius.md,
  boxShadow: refinedElevation.shadows.base,
  padding: refinedSpacing.scale[6],
  transition: `all ${refinedAnimation.duration.base} ${refinedAnimation.easing.inOut}`,
  '&:hover': {
    boxShadow: refinedElevation.shadows.md,
  },
});

// =============================================================================
// EXPORTS
// =============================================================================

export const refinedDesignSystem = {
  colors: refinedColors,
  providerColors: refinedProviderColors,
  typography: refinedTypography,
  spacing: refinedSpacing,
  elevation: refinedElevation,
  animation: refinedAnimation,
  patterns: refinedPatterns,
  breakpoints: refinedBreakpoints,
  // Utility functions
  createRefinedButton,
  createRefinedCard,
} as const;

export type RefinedDesignSystem = typeof refinedDesignSystem;
export default refinedDesignSystem; 