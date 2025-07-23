/**
 * Material-UI Theme Configuration
 * 
 * Clean theme implementation using refined design principles.
 * No more global CSS overrides or hard-coded colors!
 * 
 * @fileoverview Simplified Material-UI theme
 * @version 3.0.0
 */

import { createTheme, Theme } from '@mui/material/styles';
import { 
  refinedColors,
  refinedProviderColors,
  refinedTypography,
  refinedSpacing,
  refinedBreakpoints,
  refinedElevation,
  refinedPatterns,
  refinedAnimation,
} from '../design-system/refined-design-system';

// Legacy imports for backwards compatibility (to be removed)
import { 
  colors as oldColors,
  providerColors as oldProviderColors,
  Provider,
  type ProviderName 
} from '../design-system';

// =============================================================================
// MATERIAL-UI THEME EXTENSIONS
// =============================================================================

declare module '@mui/material/styles' {
  interface Palette {
    providers: Record<ProviderName, string>;
  }

  interface PaletteOptions {
    providers?: Partial<Record<ProviderName, string>>;
  }

  interface Theme {
    refined: {
      colors: typeof refinedColors;
      providerColors: typeof refinedProviderColors;
      typography: typeof refinedTypography;
      spacing: typeof refinedSpacing;
      breakpoints: typeof refinedBreakpoints;
      elevation: typeof refinedElevation;
      patterns: typeof refinedPatterns;
    };
    // Legacy design system (for backwards compatibility)
    designSystem: {
      colors: typeof oldColors;
      providerColors: typeof oldProviderColors;
    };
  }

  interface ThemeOptions {
    refined?: {
      colors?: typeof refinedColors;
      providerColors?: typeof refinedProviderColors;
      typography?: typeof refinedTypography;
      spacing?: typeof refinedSpacing;
      breakpoints?: typeof refinedBreakpoints;
      elevation?: typeof refinedElevation;
      patterns?: typeof refinedPatterns;
    };
    designSystem?: {
      colors?: typeof oldColors;
      providerColors?: typeof oldProviderColors;
    };
  }
}

// =============================================================================
// THEME CREATION
// =============================================================================

const theme = createTheme({
  // Refined design system
  refined: {
    colors: refinedColors,
    providerColors: refinedProviderColors,
    typography: refinedTypography,
    spacing: refinedSpacing,
    breakpoints: refinedBreakpoints,
    elevation: refinedElevation,
    patterns: refinedPatterns,
  },
  
  // Legacy design system (for backwards compatibility)
  designSystem: {
    colors: oldColors,
    providerColors: oldProviderColors,
  },
  
  // Palette using refined colors
  palette: {
    mode: 'light',
    primary: {
      main: refinedColors.primary.main,
      light: refinedColors.primary.light,
      dark: refinedColors.primary.dark,
      contrastText: refinedColors.primary.contrast,
    },
    secondary: {
      main: refinedColors.neutral[500],
      contrastText: refinedColors.text.primary,
    },
    error: {
      main: refinedColors.semantic.error,
      contrastText: '#FFFFFF',
    },
    warning: {
      main: refinedColors.semantic.warning,
      contrastText: refinedColors.text.primary,
    },
    success: {
      main: refinedColors.semantic.success,
      contrastText: '#FFFFFF',
    },
    info: {
      main: refinedColors.semantic.info,
      contrastText: '#FFFFFF',
    },
    background: {
      default: refinedColors.background.primary,
      paper: refinedColors.background.elevated,
    },
    text: {
      primary: refinedColors.text.primary,
      secondary: refinedColors.text.secondary,
      disabled: refinedColors.text.disabled,
    },
    divider: refinedColors.neutral[300],
    providers: oldProviderColors, // Keep for backwards compatibility
  },
  
  // Typography using refined system
  typography: {
    fontFamily: refinedTypography.fontFamily.sans,
    h1: {
      fontSize: refinedTypography.scale['3xl'],
      fontWeight: refinedTypography.weight.semibold,
      lineHeight: refinedTypography.lineHeight.tight,
      letterSpacing: refinedTypography.letterSpacing.tight,
    },
    h2: {
      fontSize: refinedTypography.scale['2xl'],
      fontWeight: refinedTypography.weight.semibold,
      lineHeight: refinedTypography.lineHeight.tight,
    },
    h3: {
      fontSize: refinedTypography.scale.xl,
      fontWeight: refinedTypography.weight.medium,
      lineHeight: refinedTypography.lineHeight.snug,
    },
    h4: {
      fontSize: refinedTypography.scale.lg,
      fontWeight: refinedTypography.weight.medium,
      lineHeight: refinedTypography.lineHeight.normal,
    },
    h5: {
      fontSize: refinedTypography.scale.md,
      fontWeight: refinedTypography.weight.medium,
      lineHeight: refinedTypography.lineHeight.normal,
    },
    h6: {
      fontSize: refinedTypography.scale.base,
      fontWeight: refinedTypography.weight.medium,
      lineHeight: refinedTypography.lineHeight.normal,
    },
    body1: {
      fontSize: refinedTypography.scale.base,
      lineHeight: refinedTypography.lineHeight.relaxed,
    },
    body2: {
      fontSize: refinedTypography.scale.sm,
      lineHeight: refinedTypography.lineHeight.relaxed,
    },
    caption: {
      fontSize: refinedTypography.scale.xs,
      lineHeight: refinedTypography.lineHeight.normal,
    },
  },
  
  // Spacing
  spacing: refinedSpacing.unit,
  
  // Shape
  shape: {
    borderRadius: parseInt(refinedPatterns.radius.base),
  },
  
  // Shadows
  shadows: [
    'none',
    refinedElevation.shadows.sm,
    refinedElevation.shadows.base,
    refinedElevation.shadows.md,
    refinedElevation.shadows.lg,
    refinedElevation.shadows.xl,
    // ... fill in the rest with gradual increases
    refinedElevation.shadows.xl,
    refinedElevation.shadows.xl,
    refinedElevation.shadows.xl,
    refinedElevation.shadows.xl,
    refinedElevation.shadows.xl,
    refinedElevation.shadows.xl,
    refinedElevation.shadows.xl,
    refinedElevation.shadows.xl,
    refinedElevation.shadows.xl,
    refinedElevation.shadows.xl,
    refinedElevation.shadows.xl,
    refinedElevation.shadows.xl,
    refinedElevation.shadows.xl,
    refinedElevation.shadows.xl,
    refinedElevation.shadows.xl,
    refinedElevation.shadows.xl,
    refinedElevation.shadows.xl,
    refinedElevation.shadows.xl,
    refinedElevation.shadows.xl,
  ],
  
  // Breakpoints
  breakpoints: {
    values: refinedBreakpoints,
  },
  
  // Component overrides - MINIMAL and CLEAN
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        body {
          background-color: ${refinedColors.background.primary};
          font-family: ${refinedTypography.fontFamily.sans};
          color: ${refinedColors.text.primary};
          line-height: ${refinedTypography.lineHeight.normal};
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        /* Remove all the DataGrid overrides that were causing problems! */
        /* Tables now use RefinedTable component for styling */
      `,
    },
    
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: refinedPatterns.radius.base,
          textTransform: 'none',
          fontWeight: refinedTypography.weight.medium,
          transition: `all ${refinedAnimation.duration.fast} ${refinedAnimation.easing.inOut}`,
        },
      },
    },
    
    // Clean up other components gradually...
  },
});

// =============================================================================
// EXPORTS
// =============================================================================

/**
 * Helper to get provider colors (for backwards compatibility)
 */
export const getProviderColor = (theme: Theme, provider: Provider): string => {
  return oldProviderColors[provider as keyof typeof oldProviderColors] || refinedColors.neutral[500];
};

/**
 * Re-export Provider enum for backwards compatibility
 */
export { Provider } from '../design-system';

/**
 * Type-safe theme access
 */
export type AppTheme = typeof theme;

// Animation constants are imported from refined-design-system

export default theme;

