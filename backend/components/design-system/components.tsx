/**
 * Windows 98 Component Library
 * 
 * Complete set of reusable Windows 98 themed components built with
 * Material-UI's styled() function and our design system.
 * 
 * @fileoverview Modern component library using design system tokens
 * @version 2.0.0
 */

import { styled } from '@mui/material/styles';
import { CircularProgress, Box } from '@mui/material';
import { 
  colors, 
  typography, 
  spacing, 
  sizing,
  breakpoints,
  create3DBorder,
  createButtonStyles,
  type BaseComponentProps,
  type ResponsiveProps,
  type WindowProps,
  type ButtonProps,
  type LayoutProps,
  type ButtonVariant,
  type ButtonSize,
} from './index';

// =============================================================================
// LOADING COMPONENTS
// =============================================================================

/**
 * Full-screen loading container with Windows 98 styling
 */
export const LoadingContainer = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  backgroundColor: colors.background,
  fontFamily: typography.fontFamily,
});

/**
 * Chart-specific loading container
 */
export const ChartLoadingContainer = styled('div')({
  width: '100%',
  height: '600px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.surface,
  border: `2px inset ${colors.surfaceElevated}`,
  boxShadow: sizing.shadows.md,
});

/**
 * Windows 98 themed circular progress indicator
 */
export const StyledCircularProgress = styled(CircularProgress)({
  color: colors.primary,
  '& .MuiCircularProgress-circle': {
    strokeLinecap: 'square', // Windows 98 sharp edges
  },
});

// =============================================================================
// LAYOUT COMPONENTS
// =============================================================================

/**
 * Main application container with responsive behavior
 */
export const MainContainer = styled('div')<ResponsiveProps>(({ isMobile }) => ({
  paddingTop: isMobile ? '70px' : '50px',
  margin: 0,
  backgroundColor: colors.background,
  fontFamily: typography.fontFamily,
  minHeight: '100vh',
}));

/**
 * Centered content container with max-width
 */
export const CenteredContentContainer = styled('div')({
  maxWidth: '1200px',
  margin: '0 auto',
  padding: `0 ${spacing.scale[4]}px`,
});

/**
 * Flexible layout container with Windows 98 styling
 */
export const FlexContainer = styled('div')<LayoutProps>(({ 
  direction = 'row', 
  gap = 4, 
  align = 'stretch',
  justify = 'start',
  isMobile 
}) => ({
  display: 'flex',
  flexDirection: isMobile ? 'column' : direction,
  gap: spacing.scale[gap],
  alignItems: align,
  justifyContent: justify,
  
  [`@media (max-width: ${breakpoints.md}px)`]: {
    flexDirection: 'column',
  },
}));

/**
 * Flex item with responsive behavior
 */
export const FlexItem = styled('div')<{ flex?: number } & ResponsiveProps>(({ 
  flex = 1, 
  isMobile 
}) => ({
  flex,
  maxWidth: isMobile ? '100%' : undefined,
  overflowX: 'auto',
}));

// =============================================================================
// WINDOWS 98 WINDOW COMPONENTS
// =============================================================================

/**
 * Complete Windows 98 application window
 */
export const Window = styled('div')<ResponsiveProps>(({ isMobile }) => ({
  border: `2px outset ${colors.surfaceElevated}`,
  backgroundColor: colors.surface,
  boxShadow: sizing.shadows.md,
  margin: isMobile ? 0 : spacing.scale[8],
  fontFamily: typography.fontFamily,
  
  [`@media (min-width: ${breakpoints.md}px)`]: {
    maxWidth: '640px',
    margin: `${spacing.scale[8]}px auto`,
  },
  
  [`@media (max-width: ${breakpoints.sm}px)`]: {
    height: '100vh',
    margin: 0,
    width: '100%',
  },
}));

/**
 * Windows 98 title bar with gradient
 */
export const TitleBar = styled('div')<{ title?: string }>(({ title }) => ({
  background: `linear-gradient(90deg, ${colors.primary} 0%, #1084d0 100%)`,
  color: colors.primaryText,
  padding: `${spacing.scale[1]}px ${spacing.scale[2]}px`,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.base,
  fontWeight: typography.weights.normal,
  height: `${sizing.titleBarHeight}px`,
  userSelect: 'none',
  
  '&::before': title ? {
    content: `"${title}"`,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } : {},
}));

/**
 * Title bar controls (minimize, maximize, close buttons)
 */
export const TitleBarControls = styled('div')({
  display: 'flex',
  gap: '2px',
  
  '& button': {
    width: '16px',
    height: '14px',
    border: `1px outset ${colors.surfaceElevated}`,
    backgroundColor: colors.surfaceElevated,
    fontSize: '8px',
    lineHeight: 1,
    padding: 0,
    color: colors.textPrimary,
    cursor: 'pointer',
    fontFamily: typography.fontFamily,
    
    '&:active': {
      border: `1px inset ${colors.surfaceElevated}`,
    },
    
    '&:hover': {
      backgroundColor: colors.hover,
    },
  },
});

/**
 * Window content area
 */
export const WindowBody = styled('div')({
  padding: spacing.scale[8],
  backgroundColor: colors.surface,
  fontFamily: typography.fontFamily,
});

// =============================================================================
// SECTION CONTAINERS
// =============================================================================

/**
 * Description section with Windows 98 styling
 */
export const DescriptionSection = styled('section')<ResponsiveProps>(({ isMobile }) => ({
  backgroundColor: colors.surface,
  padding: spacing.scale[8],
  border: `2px outset ${colors.surfaceElevated}`,
  marginBottom: spacing.scale[8],
  boxShadow: sizing.shadows.md,
  fontFamily: typography.fontFamily,
  
  [`@media (max-width: ${breakpoints.md}px)`]: {
    padding: spacing.scale[4],
    marginBottom: spacing.scale[4],
  },
}));

/**
 * Chart container with inset border styling
 */
export const ChartContainer = styled('section')<ResponsiveProps>(({ isMobile }) => ({
  backgroundColor: colors.surface,
  padding: spacing.scale[8],
  border: `2px inset ${colors.surfaceElevated}`,
  maxWidth: '100%',
  overflowX: 'auto',
  marginBottom: spacing.scale[8],
  boxShadow: sizing.shadows.md,
  fontFamily: typography.fontFamily,
  
  [`@media (max-width: ${breakpoints.md}px)`]: {
    padding: spacing.scale[4],
    marginBottom: spacing.scale[4],
  },
}));

/**
 * Table container with Windows 98 styling
 */
export const TableContainer = styled('section')<ResponsiveProps>(({ isMobile }) => ({
  backgroundColor: colors.surface,
  padding: spacing.scale[8],
  border: `2px inset ${colors.surfaceElevated}`,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '400px',
  marginBottom: spacing.scale[8],
  boxShadow: sizing.shadows.md,
  fontFamily: typography.fontFamily,
  
  [`@media (max-width: ${breakpoints.md}px)`]: {
    padding: spacing.scale[4],
    marginBottom: spacing.scale[4],
  },
}));

// =============================================================================
// CONTENT CONTAINERS
// =============================================================================

/**
 * Chart content with proper sizing
 */
export const ChartContent = styled('div')({
  maxWidth: '1100px',
  maxHeight: '600px',
  width: '100%',
  height: '100%',
  margin: '0 auto',
  paddingBottom: spacing.scale[6],
});

/**
 * Table content with responsive sizing
 */
export const TableContent = styled('div')<ResponsiveProps>(({ isMobile }) => ({
  height: '100%',
  width: '100%',
  maxWidth: '850px',
  overflow: 'auto',
  paddingLeft: isMobile ? 0 : spacing.scale[6],
  paddingRight: isMobile ? 0 : spacing.scale[6],
  margin: '0 auto',
}));

// =============================================================================
// TYPOGRAPHY COMPONENTS
// =============================================================================

/**
 * Page title with Windows 98 styling
 */
export const PageTitle = styled('h1')({
  textAlign: 'center',
  color: colors.textPrimary,
  marginBottom: spacing.scale[4],
  fontSize: typography.sizes['3xl'],
  fontWeight: typography.weights.normal,
  fontFamily: typography.fontFamily,
  lineHeight: typography.lineHeights.tight,
});

/**
 * Section header
 */
export const SectionHeader = styled('h4')({
  textAlign: 'center',
  color: colors.textPrimary,
  marginBottom: spacing.scale[4],
  fontSize: typography.sizes.xl,
  fontWeight: typography.weights.normal,
  fontFamily: typography.fontFamily,
  lineHeight: typography.lineHeights.normal,
});

/**
 * Subsection header
 */
export const SubsectionHeader = styled('h5')({
  color: colors.textPrimary,
  marginBottom: spacing.scale[3],
  fontSize: typography.sizes.lg,
  fontWeight: typography.weights.normal,
  fontFamily: typography.fontFamily,
  lineHeight: typography.lineHeights.normal,
});

/**
 * Body text with Windows 98 styling
 */
export const BodyText = styled('p')({
  color: colors.textPrimary,
  fontSize: typography.sizes.base,
  fontFamily: typography.fontFamily,
  lineHeight: typography.lineHeights.normal,
  marginBottom: spacing.scale[3],
});

// =============================================================================
// BUTTON COMPONENTS
// =============================================================================

/**
 * Windows 98 styled button component
 */
export const Button = styled('button')<{ 
  variant?: ButtonVariant; 
  size?: ButtonSize; 
  disabled?: boolean 
}>(({ variant = 'default', size = 'md', disabled }) => {
  const baseStyles = createButtonStyles(variant);
  
  const sizeStyles = {
    sm: { 
      minHeight: `${sizing.buttonHeight.sm}px`,
      padding: `${spacing.scale[1]}px ${spacing.scale[2]}px`,
      fontSize: typography.sizes.xs,
    },
    md: { 
      minHeight: `${sizing.buttonHeight.md}px`,
      padding: `${spacing.scale[1]}px ${spacing.scale[4]}px`,
      fontSize: typography.sizes.base,
    },
    lg: { 
      minHeight: `${sizing.buttonHeight.lg}px`,
      padding: `${spacing.scale[2]}px ${spacing.scale[6]}px`,
      fontSize: typography.sizes.md,
    },
  };
  
  const disabledStyles = disabled ? {
    opacity: 0.5,
    cursor: 'not-allowed',
    pointerEvents: 'none' as const,
  } : {};
  
  return {
    ...baseStyles,
    ...sizeStyles[size],
    ...disabledStyles,
    
    '&:active': !disabled ? {
      ...baseStyles,
      border: variant === 'primary' 
        ? `2px inset ${colors.primary}` 
        : `2px inset ${colors.surfaceElevated}`,
    } : {},
    
    '&:hover': !disabled ? {
      backgroundColor: variant === 'primary' ? colors.primary : colors.hover,
    } : {},
  };
});

// =============================================================================
// NAVIGATION COMPONENTS
// =============================================================================

/**
 * Menu bar container
 */
export const MenuBar = styled('div')({
  backgroundColor: colors.surfaceElevated,
  borderBottom: `1px solid ${colors.borderMedium}`,
  display: 'flex',
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.base,
});

/**
 * Menu item
 */
export const MenuItem = styled('a')<{ active?: boolean }>(({ active }) => ({
  padding: `${spacing.scale[1]}px ${spacing.scale[2]}px`,
  cursor: 'pointer',
  color: colors.textPrimary,
  textDecoration: 'none',
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.base,
  userSelect: 'none',
  
  ...(active && {
    backgroundColor: colors.selected,
    color: colors.selectedText,
  }),
  
  '&:hover': {
    backgroundColor: active ? colors.selected : colors.primary,
    color: colors.primaryText,
  },
}));

/**
 * Status bar
 */
export const StatusBar = styled('div')({
  backgroundColor: colors.surfaceElevated,
  borderTop: `1px solid ${colors.borderLight}`,
  borderBottom: `1px solid ${colors.borderMedium}`,
  padding: `${spacing.scale[1]}px ${spacing.scale[2]}px`,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.base,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

// =============================================================================
// UTILITY COMPONENTS
// =============================================================================

/**
 * Separator/Divider
 */
export const Separator = styled('hr')({
  border: 'none',
  borderTop: `1px solid ${colors.borderMedium}`,
  margin: `${spacing.scale[4]}px 0`,
});

/**
 * Panel with 3D border effect
 */
export const Panel = styled('div')<{ inset?: boolean }>(({ inset = false }) => ({
  backgroundColor: colors.surface,
  padding: spacing.scale[4],
  border: inset 
    ? `2px inset ${colors.surfaceElevated}`
    : `2px outset ${colors.surfaceElevated}`,
  fontFamily: typography.fontFamily,
}));

/**
 * Scrollable area with Windows 98 styling
 */
export const ScrollArea = styled('div')({
  maxHeight: '400px',
  overflowY: 'auto',
  overflowX: 'hidden',
  border: `2px inset ${colors.surfaceElevated}`,
  backgroundColor: colors.surface,
  
  // Windows 98 scrollbar styles (where supported)
  '&::-webkit-scrollbar': {
    width: '16px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: colors.surfaceElevated,
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: colors.borderMedium,
    border: `1px outset ${colors.surfaceElevated}`,
  },
});

// Export all components for easy importing
export {
  // Re-export types for convenience
  type BaseComponentProps,
  type ResponsiveProps,
  type WindowProps,
  type ButtonProps,
  type LayoutProps,
  type ButtonVariant,
  type ButtonSize,
};