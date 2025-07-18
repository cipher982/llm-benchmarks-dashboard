/**
 * Material-UI Theme Configuration
 * 
 * Modern theme implementation using our Windows 98 design system.
 * Integrates design tokens with Material-UI's theming system.
 * 
 * @fileoverview Clean Material-UI theme with design system integration
 * @version 2.0.0
 */

import { createTheme, Theme } from '@mui/material/styles';
import { 
  colors, 
  providerColors, 
  typography, 
  spacing, 
  breakpoints, 
  sizing,
  Provider,
  getProviderColor as designSystemGetProviderColor,
  type ProviderName 
} from '../design-system';

// =============================================================================
// MATERIAL-UI THEME EXTENSIONS
// =============================================================================

/**
 * Extend Material-UI's theme interface to include our design system
 */
declare module '@mui/material/styles' {
  interface Palette {
    providers: Record<ProviderName, string>;
  }

  interface PaletteOptions {
    providers?: Partial<Record<ProviderName, string>>;
  }

  interface Theme {
    designSystem: {
      colors: typeof colors;
      providerColors: typeof providerColors;
      typography: typeof typography;
      spacing: typeof spacing;
      breakpoints: typeof breakpoints;
      sizing: typeof sizing;
    };
  }

  interface ThemeOptions {
    designSystem?: {
      colors?: typeof colors;
      providerColors?: typeof providerColors;
      typography?: typeof typography;
      spacing?: typeof spacing;
      breakpoints?: typeof breakpoints;
      sizing?: typeof sizing;
    };
  }
}

// =============================================================================
// THEME UTILITIES
// =============================================================================

/**
 * Type-safe provider color getter with proper theme typing
 */
export const getProviderColor = (theme: Theme, provider: Provider): string => {
  return designSystemGetProviderColor(provider);
};

/**
 * Re-export Provider enum and types for convenience
 */
export { Provider } from '../design-system';
export type { ProviderName } from '../design-system';


// =============================================================================
// MATERIAL-UI THEME CREATION
// =============================================================================

/**
 * Create the Material-UI theme using our design system tokens
 */
const theme = createTheme({
  // Design system integration
  designSystem: {
    colors,
    providerColors,
    typography,
    spacing,
    breakpoints,
    sizing,
  },
  
  // Palette using design system colors
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary,
      contrastText: colors.primaryText,
    },
    secondary: {
      main: colors.borderMedium,
      contrastText: colors.primaryText,
    },
    error: {
      main: colors.error,
      contrastText: colors.primaryText,
    },
    background: {
      default: colors.background,
      paper: colors.surface,
    },
    text: {
      primary: colors.textPrimary,
      secondary: colors.textSecondary,
      disabled: colors.textDisabled,
    },
    divider: colors.borderMedium,
    // Provider colors integrated into theme
    providers: providerColors,
  },
  
  // Spacing using design system
  spacing: spacing.unit,
  
  // Breakpoints using design system
  breakpoints: {
    values: breakpoints,
  },
  
  // Typography using design system
  typography: {
    fontFamily: typography.fontFamily,
    h1: {
      fontSize: typography.sizes['3xl'],
      fontWeight: typography.weights.normal,
      lineHeight: typography.lineHeights.tight,
    },
    h2: {
      fontSize: typography.sizes['2xl'],
      fontWeight: typography.weights.normal,
      lineHeight: typography.lineHeights.tight,
    },
    h3: {
      fontSize: typography.sizes.xl,
      fontWeight: typography.weights.normal,
      lineHeight: typography.lineHeights.normal,
    },
    h4: {
      fontSize: typography.sizes.lg,
      fontWeight: typography.weights.normal,
      lineHeight: typography.lineHeights.normal,
    },
    h5: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.normal,
      lineHeight: typography.lineHeights.normal,
    },
    h6: {
      fontSize: typography.sizes.base,
      fontWeight: typography.weights.normal,
      lineHeight: typography.lineHeights.normal,
    },
    body1: {
      fontSize: typography.sizes.base,
      lineHeight: typography.lineHeights.normal,
    },
    body2: {
      fontSize: typography.sizes.sm,
      lineHeight: typography.lineHeights.normal,
    },
    caption: {
      fontSize: typography.sizes.xs,
      lineHeight: typography.lineHeights.tight,
    },
  },
  
  // Shape using design system
  shape: {
    borderRadius: 0, // Windows 98 sharp corners
  },
  
  // Component overrides using design system tokens
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          border: `2px outset ${colors.surfaceElevated}`,
          backgroundColor: colors.surfaceElevated,
          color: colors.textPrimary,
          fontFamily: typography.fontFamily,
          fontSize: typography.sizes.base,
          textTransform: 'none',
          minHeight: `${sizing.buttonHeight.md}px`,
          padding: `${spacing.scale[1]}px ${spacing.scale[4]}px`,
          '&:hover': {
            backgroundColor: colors.hover,
            border: `2px outset ${colors.surfaceElevated}`,
          },
          '&:active': {
            border: `2px inset ${colors.surfaceElevated}`,
          },
        },
        containedPrimary: {
          backgroundColor: colors.primary,
          color: colors.primaryText,
          border: `2px outset ${colors.primary}`,
          '&:hover': {
            backgroundColor: colors.primary,
            border: `2px outset ${colors.primary}`,
          },
          '&:active': {
            border: `2px inset ${colors.primary}`,
          },
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          borderColor: colors.borderMedium,
          border: `1px solid ${colors.borderMedium}`,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: typography.weights.normal,
          backgroundColor: colors.surfaceElevated,
          borderBottom: `1px solid ${colors.borderMedium}`,
          fontFamily: typography.fontFamily,
          fontSize: typography.sizes.base,
        },
        root: {
          borderBottom: `1px solid ${colors.borderMedium}`,
          fontFamily: typography.fontFamily,
          fontSize: typography.sizes.base,
          padding: `${spacing.scale[1]}px ${spacing.scale[2]}px`,
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          color: colors.primary,
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: `
        .MuiDataGrid-root {
          border: 1px solid ${colors.borderMedium};
          font-family: ${typography.fontFamily};
          font-size: ${typography.sizes.base};
          background-color: ${colors.surface};
          
          & .MuiDataGrid-columnHeaders {
            background-color: ${colors.surfaceElevated};
            border-bottom: 2px solid ${colors.borderMedium};
            font-weight: ${typography.weights.normal};
          }
          
          & .MuiDataGrid-cell {
            border-bottom: 1px solid ${colors.borderMedium};
            border-right: 1px solid ${colors.borderMedium};
          }
          
          & .MuiDataGrid-columnSeparator {
            color: ${colors.borderMedium};
          }
        }
      `,
    },
  },
});

// =============================================================================
// EXPORTS
// =============================================================================

export default theme;

/**
 * Type-safe theme access for components
 */
export type AppTheme = typeof theme;

/**
 * Design system re-exports for convenience
 */
export {
  colors,
  providerColors,
  typography,
  spacing,
  breakpoints,
  sizing,
} from '../design-system';

