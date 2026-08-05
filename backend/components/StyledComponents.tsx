/**
 * Page-level layout primitives, Console direction.
 *
 * Same export names as the Win98 set they replace, so pages keep compiling.
 * The shape changed underneath: no cards, no bevels, no centred 850px column —
 * a block is full-bleed, introduced by a rail, and closed by a hairline.
 */

import { styled } from '@mui/material/styles';
import { CircularProgress } from '@mui/material';
import { colors, typography, numeric, spacing, sizing } from './design-system';

// Loading Components
export const LoadingContainer = styled('div')({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: colors.ground,
});

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
});

// Content Containers
export const CenteredContentContainer = styled('div')({
    maxWidth: '92ch',
    margin: 0,
});

export const ChartContentContainer = styled('div')({
    width: '100%',
    padding: `${spacing.scale[2]}px ${spacing.scale[4]}px ${spacing.scale[3]}px`,
});

/**
 * Dense tables scroll horizontally instead of being squeezed into a measure.
 */
export const TableContentContainer = styled('div')<{ isMobile?: boolean }>({
    width: '100%',
    overflowX: 'auto',
});

// =============================================================================
// SECTION RAIL
// =============================================================================

/**
 * The rail that heads every block. `SectionHeader` sits at its left, controls
 * at its right.
 */
export const SectionHeaderRow = styled('div')<{ isMobile?: boolean }>({
    display: 'flex',
    alignItems: 'center',
    gap: `${spacing.scale[3]}px`,
    minHeight: `${sizing.sectionHeaderHeight}px`,
    padding: `${spacing.scale[2]}px ${spacing.scale[4]}px`,
    backgroundColor: colors.surface,
    borderBottom: `1px solid ${colors.rule}`,
    flexWrap: 'wrap',
});

/** Alias kept for pages that read the rail as "header plus its controls". */
export const SectionHeaderWithControl = SectionHeaderRow;

export const SectionHeader = styled('h2')({
    margin: 0,
    color: colors.textDim,
    fontFamily: typography.monoFamily,
    fontSize: typography.sizes.micro,
    fontWeight: typography.weights.medium,
    letterSpacing: typography.tracking.label,
    textTransform: 'uppercase',
    lineHeight: typography.lineHeights.tight,
    whiteSpace: 'nowrap',
});

export const PageTitle = styled('h1')({
    margin: 0,
    color: colors.text,
    fontFamily: typography.monoFamily,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    letterSpacing: typography.tracking.tag,
    lineHeight: typography.lineHeights.tight,
});

/** Controls docked right on a rail. */
export const RailControls = styled('div')({
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: `${spacing.scale[2]}px`,
    flexWrap: 'wrap',
});

/**
 * Free text on a rail — a count, a window, a caveat. Dim and small so it never
 * competes with the values inside the block.
 */
export const RailNote = styled('span')({
    ...numeric,
    fontSize: typography.sizes.micro,
    letterSpacing: typography.tracking.tag,
    textTransform: 'uppercase',
    color: colors.textMute,

    '& b': {
        color: colors.textDim,
        fontWeight: typography.weights.medium,
    },
});

// =============================================================================
// SECTION CONTAINERS
// =============================================================================

/**
 * Prose. The only sentences on a page, and they sit under the measurement.
 */
export const StyledDescriptionSection = styled('div')<{ isMobile?: boolean }>({
    backgroundColor: colors.surface,
    borderBottom: `1px solid ${colors.rule}`,
    padding: `${spacing.scale[3]}px ${spacing.scale[4]}px ${spacing.scale[4]}px`,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.sm,
    lineHeight: typography.lineHeights.relaxed,
    color: colors.textMute,

    '& p': { margin: `0 0 ${spacing.scale[2]}px`, maxWidth: '92ch' },
    '& p:last-child': { marginBottom: 0 },
    '& b, & strong': { color: colors.textDim, fontWeight: typography.weights.medium },
    '& a': { color: colors.accent },
});

export const StyledChartContainer = styled('div')<{ isMobile?: boolean }>({
    backgroundColor: colors.ground,
    borderBottom: `1px solid ${colors.rule}`,
    maxWidth: '100%',
    fontFamily: typography.monoFamily,
});

export const StyledTableContainer = styled('div')<{ isMobile?: boolean }>({
    backgroundColor: colors.ground,
    borderBottom: `1px solid ${colors.rule}`,
    display: 'block',
    fontFamily: typography.monoFamily,
});

export const TimeRangeContainer = styled('div')({
    display: 'flex',
    alignItems: 'center',
    gap: '1px',
});

// Flexible layout containers
export const FlexContainer = styled('div')<{ isMobile?: boolean; direction?: 'row' | 'column'; gap?: number }>(({ theme, isMobile, direction = 'row', gap = 0 }) => ({
    display: 'flex',
    flexDirection: isMobile ? 'column' : direction,
    gap: theme.spacing(gap),
    [theme.breakpoints.down('md')]: {
        flexDirection: 'column',
    },
}));

export const FlexItem = styled('div')<{ flex?: number; isMobile?: boolean }>(({ flex }) => ({
    flex: flex || 1,
    minWidth: 0,
    overflowX: 'auto',
}));

export const LeaderboardContainer = styled('div')({
    display: 'flex',
    flexDirection: 'column',
});

export const ChartWrapper = styled('div')<{ isMobile?: boolean }>({
    width: '100%',
    margin: 0,
});
