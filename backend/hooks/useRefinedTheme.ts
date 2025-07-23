/**
 * useRefinedTheme Hook
 * 
 * Simplifies access to refined design tokens throughout the app.
 * No more digging through theme.refined.colors.neutral[300]!
 */

import { useTheme } from '@mui/material/styles';
import { 
  refinedColors,
  refinedTypography,
  refinedSpacing,
  refinedElevation,
  refinedPatterns,
  refinedAnimation,
  refinedProviderColors,
} from '../components/design-system/refined-design-system';

export const useRefinedTheme = () => {
  const muiTheme = useTheme();
  
  return {
    // Direct access to refined tokens
    colors: refinedColors,
    typography: refinedTypography,
    spacing: refinedSpacing,
    elevation: refinedElevation,
    patterns: refinedPatterns,
    animation: refinedAnimation,
    providerColors: refinedProviderColors,
    
    // Helper functions
    space: (multiplier: number) => refinedSpacing.scale[multiplier as keyof typeof refinedSpacing.scale] || (multiplier * refinedSpacing.unit),
    
    // Breakpoint helpers
    isMobile: muiTheme.breakpoints.down('sm'),
    isTablet: muiTheme.breakpoints.between('sm', 'md'),
    isDesktop: muiTheme.breakpoints.up('md'),
    
    // Quick color getters
    getProviderColor: (provider: string) => {
      return refinedProviderColors[provider as keyof typeof refinedProviderColors] || refinedColors.neutral[500];
    },
    
    // Status colors
    getStatusColor: (status: 'success' | 'warning' | 'error' | 'info') => {
      return refinedColors.semantic[status];
    },
  };
};

// Type for the hook return
export type RefinedTheme = ReturnType<typeof useRefinedTheme>; 