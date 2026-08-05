/**
 * Material-UI theme for the Console design system.
 *
 * MUI is still used for layout primitives, media queries and a handful of
 * controls, so its defaults have to resolve to the same tokens the rest of the
 * site uses. Everything here reads from `../design-system`; nothing declares a
 * colour of its own.
 */

import { createTheme, Theme } from '@mui/material/styles';
import {
  colors,
  providerColors,
  seriesRamp,
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
      seriesRamp: typeof seriesRamp;
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
      seriesRamp?: typeof seriesRamp;
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

export { Provider } from '../design-system';
export type { ProviderName } from '../design-system';


// =============================================================================
// MATERIAL-UI THEME CREATION
// =============================================================================

const theme = createTheme({
  designSystem: {
    colors,
    providerColors,
    seriesRamp,
    typography,
    spacing,
    breakpoints,
    sizing,
  },

  palette: {
    mode: 'dark',
    primary: {
      main: colors.accent,
      contrastText: colors.accentInk,
    },
    secondary: {
      main: colors.textDim,
      contrastText: colors.ground,
    },
    error: {
      main: colors.bad,
      contrastText: colors.ground,
    },
    warning: {
      main: colors.warn,
      contrastText: colors.ground,
    },
    success: {
      main: colors.ok,
      contrastText: colors.ground,
    },
    background: {
      default: colors.ground,
      paper: colors.surface,
    },
    text: {
      primary: colors.text,
      secondary: colors.textDim,
      disabled: colors.textMute,
    },
    divider: colors.rule,
    providers: providerColors,
  },

  spacing: spacing.unit,

  breakpoints: {
    values: breakpoints,
  },

  // The type scale is deliberately compressed. Headings are section labels, not
  // display type — the largest thing on a page should be a measured value.
  typography: {
    fontFamily: typography.fontFamily,
    h1: {
      fontFamily: typography.monoFamily,
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.medium,
      letterSpacing: typography.tracking.tag,
      lineHeight: typography.lineHeights.tight,
    },
    h2: {
      fontFamily: typography.monoFamily,
      fontSize: typography.sizes.micro,
      fontWeight: typography.weights.medium,
      letterSpacing: typography.tracking.label,
      textTransform: 'uppercase',
      lineHeight: typography.lineHeights.tight,
    },
    h3: {
      fontFamily: typography.monoFamily,
      fontSize: typography.sizes.xs,
      fontWeight: typography.weights.medium,
      letterSpacing: typography.tracking.label,
      textTransform: 'uppercase',
      lineHeight: typography.lineHeights.normal,
    },
    h4: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weights.medium,
      lineHeight: typography.lineHeights.normal,
    },
    h5: {
      fontSize: typography.sizes.base,
      fontWeight: typography.weights.medium,
      lineHeight: typography.lineHeights.normal,
    },
    h6: {
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.medium,
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
      fontFamily: typography.monoFamily,
      fontSize: typography.sizes.xs,
      lineHeight: typography.lineHeights.tight,
    },
  },

  shape: {
    borderRadius: 0,
  },

  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          border: `1px solid ${colors.rule}`,
          backgroundColor: colors.raised,
          color: colors.textDim,
          fontFamily: typography.monoFamily,
          fontSize: typography.sizes.micro,
          letterSpacing: typography.tracking.tag,
          textTransform: 'uppercase',
          minHeight: `${sizing.buttonHeight.sm}px`,
          padding: `${spacing.scale[1]}px ${spacing.scale[2]}px`,
          boxShadow: 'none',
          '&:hover': {
            backgroundColor: colors.raised,
            border: `1px solid ${colors.rule}`,
            color: colors.text,
            boxShadow: 'none',
          },
        },
        containedPrimary: {
          backgroundColor: colors.accent,
          color: colors.accentInk,
          border: `1px solid ${colors.accent}`,
          '&:hover': {
            backgroundColor: colors.accent,
            color: colors.accentInk,
            border: `1px solid ${colors.accent}`,
          },
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          borderColor: colors.rule,
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          color: colors.text,
          fontFamily: typography.monoFamily,
          fontSize: typography.sizes.sm,
          '& .MuiInputBase-input': {
            color: colors.text,
          },
          '& .MuiSvgIcon-root': {
            color: colors.textMute,
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: {
          color: colors.textMute,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontFamily: typography.monoFamily,
          fontSize: typography.sizes.micro,
          fontWeight: typography.weights.medium,
          letterSpacing: typography.tracking.label,
          textTransform: 'uppercase',
          color: colors.textMute,
          backgroundColor: colors.surface,
          borderBottom: `1px solid ${colors.rule}`,
        },
        root: {
          borderBottom: `1px solid ${colors.ruleSoft}`,
          fontFamily: typography.monoFamily,
          fontSize: typography.sizes.sm,
          fontVariantNumeric: 'tabular-nums',
          color: colors.text,
          padding: `${spacing.scale[1]}px ${spacing.scale[2]}px`,
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          color: colors.textMute,
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: colors.accent,
          textDecorationColor: colors.rule,
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: `
        html {
          background-color: ${colors.ground};
        }

        body {
          background-color: ${colors.ground};
          color: ${colors.text};
          font-family: ${typography.monoFamily};
          font-size: ${typography.sizes.base};
          line-height: ${typography.lineHeights.normal};
          -webkit-font-smoothing: antialiased;
        }

        ::selection {
          background-color: ${colors.accent};
          color: ${colors.accentInk};
        }

        :focus-visible {
          outline: 1px solid ${colors.accent};
          outline-offset: 1px;
        }
      `,
    },
  },
});

// =============================================================================
// EXPORTS
// =============================================================================

export default theme;

export type AppTheme = typeof theme;

export {
  colors,
  providerColors,
  seriesRamp,
  typography,
  spacing,
  breakpoints,
  sizing,
} from '../design-system';
