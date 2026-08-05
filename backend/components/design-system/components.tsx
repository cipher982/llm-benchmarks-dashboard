/**
 * Console component library.
 *
 * The page is a stack of full-bleed blocks separated by hairlines. There is no
 * card, no bevel and no shadow: depth is the ground → surface → raised step and
 * nothing else. Blocks are introduced by a 30px rail carrying an all-caps micro
 * label on the left and its controls on the right.
 *
 * Export names are unchanged from the Win98 library so existing pages keep
 * compiling while they are ported block by block.
 */

import { styled } from '@mui/material/styles';
import { CircularProgress } from '@mui/material';
import {
  colors,
  typography,
  numeric,
  spacing,
  sizing,
  breakpoints,
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

export const LoadingContainer = styled('div')({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  backgroundColor: colors.ground,
  fontFamily: typography.monoFamily,
});

/**
 * Placeholder that holds a chart's slot while it loads. Sized well below the
 * old 600px so a loading page is not taller than the page it becomes.
 */
export const ChartLoadingContainer = styled('div')({
  width: '100%',
  minHeight: '220px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.ground,
});

export const StyledCircularProgress = styled(CircularProgress)({
  color: colors.accent,
  '& .MuiCircularProgress-circle': {
    strokeLinecap: 'butt',
  },
});

// =============================================================================
// LAYOUT COMPONENTS
// =============================================================================

const fixedNavOffset = {
  desktop: `${sizing.navHeight}px`,
  stacked: `${sizing.navHeight * 2}px`,
} as const;

/**
 * Page body. Full-bleed — the Console layout runs edge to edge and uses rules,
 * not margins, to separate blocks.
 */
export const MainContainer = styled('main')<ResponsiveProps>(({ isMobile }) => ({
  paddingTop: isMobile ? fixedNavOffset.stacked : fixedNavOffset.desktop,
  margin: 0,
  backgroundColor: colors.ground,
  color: colors.text,
  fontFamily: typography.monoFamily,
  fontSize: typography.sizes.base,
  minHeight: '100vh',
  [`@media (max-width: ${breakpoints.md}px)`]: {
    paddingTop: fixedNavOffset.stacked,
  },
}));

/**
 * Constrains prose to a readable measure. Measured content is not centred —
 * only sentences are.
 */
export const CenteredContentContainer = styled('div')({
  maxWidth: '92ch',
  margin: 0,
  padding: `${spacing.scale[3]}px ${spacing.scale[4]}px`,
});

/**
 * Wrapper for the model and provider templates, which are documents rather
 * than dashboards and so keep a measure.
 */
export const DesktopShell = styled('div')(({ theme }) => ({
  width: '100%',
  minHeight: '100%',
  display: 'flex',
  justifyContent: 'center',
  boxSizing: 'border-box',
  backgroundColor: colors.ground,
  padding: `0 0 ${theme.spacing(8)}`,
}));

/**
 * Content column for those document pages.
 */
export const DesktopWindow = styled('div')(({ theme }) => ({
  width: '100%',
  maxWidth: 1120,
  backgroundColor: colors.ground,
  color: colors.text,
  borderLeft: `1px solid ${colors.rule}`,
  borderRight: `1px solid ${colors.rule}`,
  display: 'flex',
  flexDirection: 'column',
  [theme.breakpoints.down('lg')]: {
    borderLeft: 'none',
    borderRight: 'none',
  },
}));

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

export const FlexItem = styled('div')<{ flex?: number } & ResponsiveProps>(({
  flex = 1,
  isMobile
}) => ({
  flex,
  maxWidth: isMobile ? '100%' : undefined,
  overflowX: 'auto',
}));

// =============================================================================
// CONSOLE STRUCTURE
// =============================================================================

/**
 * A block of the page. Separated from the next by a single rule; no padding of
 * its own, because the content inside decides its own gutter.
 */
export const Window = styled('section')<ResponsiveProps>(() => ({
  backgroundColor: colors.ground,
  borderBottom: `1px solid ${colors.rule}`,
  fontFamily: typography.monoFamily,
}));

/**
 * The rail that heads a block: micro label left, controls right. Replaces the
 * gradient title bar.
 */
export const TitleBar = styled('div')<{ title?: string }>(({ title }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: `${spacing.scale[3]}px`,
  minHeight: `${sizing.sectionHeaderHeight}px`,
  padding: `${spacing.scale[2]}px ${spacing.scale[4]}px`,
  backgroundColor: colors.surface,
  borderBottom: `1px solid ${colors.rule}`,
  fontFamily: typography.monoFamily,
  fontSize: typography.sizes.micro,
  letterSpacing: typography.tracking.label,
  textTransform: 'uppercase',
  color: colors.textDim,
  userSelect: 'none',

  '&::before': title ? {
    content: `"${title}"`,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  } : {},
}));

/**
 * Controls docked to the right of a rail — time range, filters.
 */
export const TitleBarControls = styled('div')({
  marginLeft: 'auto',
  display: 'flex',
  gap: '1px',

  '& button': {
    ...createButtonStyles('default'),
  },
});

export const WindowBody = styled('div')({
  padding: `${spacing.scale[3]}px ${spacing.scale[4]}px`,
  backgroundColor: colors.ground,
  fontFamily: typography.monoFamily,
});

// =============================================================================
// SECTION CONTAINERS
// =============================================================================

/**
 * Prose block. The only place sentences are allowed, and it sits below the
 * measurement rather than above it.
 */
export const DescriptionSection = styled('section')<ResponsiveProps>(() => ({
  backgroundColor: colors.surface,
  borderBottom: `1px solid ${colors.rule}`,
  padding: `${spacing.scale[3]}px ${spacing.scale[4]}px ${spacing.scale[4]}px`,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.sm,
  lineHeight: typography.lineHeights.relaxed,
  color: colors.textMute,

  '& b, & strong': {
    color: colors.textDim,
    fontWeight: typography.weights.medium,
  },
  '& a': {
    color: colors.accent,
  },
}));

export const ChartContainer = styled('section')<ResponsiveProps>(() => ({
  backgroundColor: colors.ground,
  borderBottom: `1px solid ${colors.rule}`,
  maxWidth: '100%',
  overflowX: 'auto',
  fontFamily: typography.monoFamily,
}));

export const TableContainer = styled('section')<ResponsiveProps>(() => ({
  backgroundColor: colors.ground,
  borderBottom: `1px solid ${colors.rule}`,
  display: 'block',
  fontFamily: typography.monoFamily,
}));

// =============================================================================
// CONTENT CONTAINERS
// =============================================================================

export const ChartContent = styled('div')({
  width: '100%',
  margin: 0,
  padding: `${spacing.scale[2]}px ${spacing.scale[4]}px ${spacing.scale[3]}px`,
});

/**
 * Tables are wide and dense; they scroll horizontally rather than wrap.
 */
export const TableContent = styled('div')<ResponsiveProps>(() => ({
  width: '100%',
  overflowX: 'auto',
  margin: 0,
}));

// =============================================================================
// TYPOGRAPHY COMPONENTS
// =============================================================================

/**
 * Page title. Small and left-aligned: it identifies the page, it does not
 * introduce it.
 */
export const PageTitle = styled('h1')({
  margin: 0,
  color: colors.text,
  fontSize: typography.sizes.md,
  fontWeight: typography.weights.medium,
  fontFamily: typography.monoFamily,
  letterSpacing: typography.tracking.tag,
  lineHeight: typography.lineHeights.tight,
});

/**
 * Block label. Same treatment as the rail, so a heading and a rail read as one
 * system wherever they appear together.
 */
export const SectionHeader = styled('h2')({
  margin: 0,
  color: colors.textDim,
  fontSize: typography.sizes.micro,
  fontWeight: typography.weights.medium,
  fontFamily: typography.monoFamily,
  letterSpacing: typography.tracking.label,
  textTransform: 'uppercase',
  lineHeight: typography.lineHeights.tight,
});

export const SubsectionHeader = styled('h5')({
  margin: `0 0 ${spacing.scale[2]}px`,
  color: colors.textDim,
  fontSize: typography.sizes.xs,
  fontWeight: typography.weights.medium,
  fontFamily: typography.monoFamily,
  letterSpacing: typography.tracking.tag,
  textTransform: 'uppercase',
  lineHeight: typography.lineHeights.normal,
});

export const BodyText = styled('p')({
  color: colors.textMute,
  fontSize: typography.sizes.sm,
  fontFamily: typography.fontFamily,
  lineHeight: typography.lineHeights.relaxed,
  margin: `0 0 ${spacing.scale[2]}px`,
});

/**
 * A measured value. Anything the site actually measured is set with this.
 */
export const Figure = styled('span')<{ size?: 'sm' | 'md' | 'lg' | 'xl' }>(({ size = 'lg' }) => ({
  ...numeric,
  fontSize: typography.sizes[size],
  fontWeight: typography.weights.medium,
  letterSpacing: typography.tracking.figure,
  lineHeight: typography.lineHeights.tight,
  color: colors.text,
}));

/**
 * The unit that trails a figure. Deliberately much smaller — the number is the
 * content, the unit is a footnote to it.
 */
export const FigureUnit = styled('small')({
  fontFamily: typography.monoFamily,
  fontSize: typography.sizes.xs,
  fontWeight: typography.weights.normal,
  color: colors.textMute,
  marginLeft: '3px',
  letterSpacing: 0,
});

/**
 * All-caps micro label above a figure or beside a row.
 */
export const MicroLabel = styled('span')({
  display: 'block',
  fontFamily: typography.monoFamily,
  fontSize: typography.sizes.micro,
  letterSpacing: typography.tracking.label,
  textTransform: 'uppercase',
  color: colors.textMute,
  whiteSpace: 'nowrap',
});

// =============================================================================
// METER STRIP
// =============================================================================

/**
 * The row of global aggregates that opens a page. Every cell is a distinct
 * statistic — a value that appears here does not appear again lower down.
 */
export const MeterStrip = styled('dl')<{ columns?: number }>(({ columns = 8 }) => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
  margin: 0,
  backgroundColor: colors.surface,
  borderBottom: `1px solid ${colors.rule}`,

  '& > div': {
    padding: `${spacing.scale[2]}px ${spacing.scale[4]}px`,
    borderRight: `1px solid ${colors.rule}`,
    minWidth: 0,
  },
  '& > div:last-of-type': {
    borderRight: 0,
  },
  '& dt': {
    fontSize: typography.sizes.micro,
    letterSpacing: typography.tracking.label,
    textTransform: 'uppercase',
    color: colors.textMute,
    marginBottom: '5px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  '& dd': {
    ...numeric,
    margin: 0,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.medium,
    letterSpacing: typography.tracking.figure,
    lineHeight: 1,
    color: colors.text,
  },

  [`@media (max-width: ${breakpoints.lg}px)`]: {
    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
    '& > div': { borderBottom: `1px solid ${colors.rule}` },
    '& > div:nth-of-type(4n)': { borderRight: 0 },
  },
  [`@media (max-width: ${breakpoints.sm}px)`]: {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    '& > div:nth-of-type(4n)': { borderRight: `1px solid ${colors.rule}` },
    '& > div:nth-of-type(2n)': { borderRight: 0 },
  },
}));

/**
 * Two blocks side by side with a rule between them, collapsing to a stack.
 */
export const SplitRow = styled('div')<{ asideWidth?: number }>(({ asideWidth = 420 }) => ({
  display: 'grid',
  gridTemplateColumns: `minmax(0, 1fr) ${asideWidth}px`,
  borderBottom: `1px solid ${colors.rule}`,

  '& > *': {
    borderRight: `1px solid ${colors.rule}`,
    minWidth: 0,
  },
  '& > *:last-child': {
    borderRight: 0,
  },

  [`@media (max-width: ${breakpoints.lg}px)`]: {
    gridTemplateColumns: 'minmax(0, 1fr)',
    '& > *': {
      borderRight: 0,
      borderBottom: `1px solid ${colors.rule}`,
    },
    '& > *:last-child': { borderBottom: 0 },
  },
}));

// =============================================================================
// BUTTON COMPONENTS
// =============================================================================

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
      fontSize: typography.sizes.micro,
    },
    md: {
      minHeight: `${sizing.buttonHeight.md}px`,
      padding: `${spacing.scale[1]}px ${spacing.scale[3]}px`,
      fontSize: typography.sizes.micro,
    },
    lg: {
      minHeight: `${sizing.buttonHeight.lg}px`,
      padding: `${spacing.scale[2]}px ${spacing.scale[4]}px`,
      fontSize: typography.sizes.xs,
    },
  };

  const disabledStyles = disabled ? {
    opacity: 0.4,
    cursor: 'not-allowed',
    pointerEvents: 'none' as const,
  } : {};

  return {
    ...baseStyles,
    ...sizeStyles[size],
    ...disabledStyles,

    '&:hover': !disabled ? {
      color: variant === 'primary' ? colors.accentInk : colors.text,
    } : {},
  };
});

// =============================================================================
// NAVIGATION COMPONENTS
// =============================================================================

export const MenuBar = styled('div')({
  display: 'flex',
  alignItems: 'center',
  height: `${sizing.navHeight}px`,
  backgroundColor: colors.surface,
  borderBottom: `1px solid ${colors.rule}`,
  fontFamily: typography.monoFamily,
});

/**
 * Navigation item. Separated by rules rather than spacing, so the bar reads as
 * a strip of cells like the rest of the page.
 */
export const MenuItem = styled('a')<{ active?: boolean }>(({ active }) => ({
  padding: `0 ${spacing.scale[4]}px`,
  height: `${sizing.navHeight}px`,
  lineHeight: `${sizing.navHeight}px`,
  cursor: 'pointer',
  textDecoration: 'none',
  fontFamily: typography.monoFamily,
  fontSize: typography.sizes.xs,
  letterSpacing: typography.tracking.tag,
  textTransform: 'uppercase',
  userSelect: 'none',
  borderLeft: `1px solid ${colors.rule}`,
  color: active ? colors.text : colors.textMute,
  backgroundColor: active ? colors.raised : 'transparent',

  '&:hover': {
    color: colors.text,
  },
}));

export const StatusBar = styled('div')({
  backgroundColor: colors.surface,
  borderTop: `1px solid ${colors.rule}`,
  padding: `${spacing.scale[2]}px ${spacing.scale[4]}px`,
  fontFamily: typography.monoFamily,
  fontSize: typography.sizes.xs,
  color: colors.textMute,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
});

// =============================================================================
// UTILITY COMPONENTS
// =============================================================================

export const Separator = styled('hr')({
  border: 'none',
  borderTop: `1px solid ${colors.rule}`,
  margin: 0,
});

export const Panel = styled('div')<{ inset?: boolean }>(({ inset = false }) => ({
  backgroundColor: inset ? colors.surface : colors.raised,
  padding: `${spacing.scale[3]}px ${spacing.scale[4]}px`,
  border: `1px solid ${colors.rule}`,
  fontFamily: typography.monoFamily,
}));

export const ScrollArea = styled('div')({
  maxHeight: '400px',
  overflowY: 'auto',
  overflowX: 'hidden',
  border: `1px solid ${colors.rule}`,
  backgroundColor: colors.surface,

  '&::-webkit-scrollbar': {
    width: '10px',
    height: '10px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: colors.surface,
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: colors.rule,
  },
  '&::-webkit-scrollbar-thumb:hover': {
    backgroundColor: colors.textMute,
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
