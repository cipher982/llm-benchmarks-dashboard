import { styled } from '@mui/material/styles';
import { CircularProgress } from '@mui/material';

// Loading Components
export const LoadingContainer = styled('div')(({ theme }) => ({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    backgroundColor: theme.palette.background.default,
}));

export const ChartLoadingContainer = styled('div')(({ theme }) => ({
    width: '100%',
    height: '600px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.palette.background.default,
}));

export const StyledCircularProgress = styled(CircularProgress)(({ theme }) => ({
    color: theme.palette.primary.main,
}));

// Content Containers
export const CenteredContentContainer = styled('div')(({ theme }) => ({
    maxWidth: '1200px',
    margin: 'auto',
    padding: theme.spacing(0, 2),
}));

export const ChartContentContainer = styled('div')(({ theme }) => ({
    maxWidth: '1100px',
    maxHeight: '600px',
    width: '100%',
    height: '100%',
    margin: 'auto',
    paddingBottom: theme.spacing(3),
}));

export const TableContentContainer = styled('div')<{ isMobile?: boolean }>(({ theme, isMobile }) => ({
    height: '100%',
    width: '100%',
    maxWidth: '850px',
    overflow: 'auto',
    paddingLeft: isMobile ? 0 : theme.spacing(3),
    paddingRight: isMobile ? 0 : theme.spacing(3),
    margin: 'auto',
}));

// Section Headers
export const SectionHeader = styled('h4')(({ theme }) => ({
    textAlign: 'center',
    color: theme.palette.text.primary,
    marginBottom: theme.spacing(2),
    fontSize: theme.typography.h4.fontSize,
    fontWeight: theme.typography.h4.fontWeight,
}));

export const PageTitle = styled('h1')(({ theme }) => ({
    textAlign: 'center',
    color: theme.palette.text.primary,
    marginBottom: theme.spacing(2),
    fontSize: theme.typography.h1.fontSize,
    fontWeight: theme.typography.h1.fontWeight,
}));

// Enhanced Section Containers with consistent styling
export const StyledDescriptionSection = styled('div')<{ isMobile?: boolean }>(({ theme, isMobile }) => ({
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(3),
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(3),
    boxShadow: theme.shadows[1],
    border: `1px solid ${theme.palette.divider}`,
    [theme.breakpoints.down('md')]: {
        padding: theme.spacing(2),
        marginBottom: theme.spacing(2),
    },
}));

export const StyledChartContainer = styled('div')<{ isMobile?: boolean }>(({ theme, isMobile }) => ({
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(3),
    borderRadius: theme.shape.borderRadius,
    maxWidth: '100%',
    overflowX: 'auto',
    marginBottom: theme.spacing(3),
    boxShadow: theme.shadows[1],
    border: `1px solid ${theme.palette.divider}`,
    [theme.breakpoints.down('md')]: {
        padding: theme.spacing(2),
        marginBottom: theme.spacing(2),
    },
}));

export const StyledTableContainer = styled('div')<{ isMobile?: boolean }>(({ theme, isMobile }) => ({
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(3),
    borderRadius: theme.shape.borderRadius,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    marginBottom: theme.spacing(3),
    boxShadow: theme.shadows[1],
    border: `1px solid ${theme.palette.divider}`,
    [theme.breakpoints.down('md')]: {
        padding: theme.spacing(2),
        marginBottom: theme.spacing(2),
    },
}));

// Time Range Selector (if needed)
export const TimeRangeContainer = styled('div')(({ theme }) => ({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing(2),
    marginBottom: theme.spacing(3),
    [theme.breakpoints.down('sm')]: {
        flexDirection: 'column',
        gap: theme.spacing(1),
    },
}));

// Flexible layout containers
export const FlexContainer = styled('div')<{ isMobile?: boolean; direction?: 'row' | 'column'; gap?: number }>(({ theme, isMobile, direction = 'row', gap = 2 }) => ({
    display: 'flex',
    flexDirection: isMobile ? 'column' : direction,
    justifyContent: 'space-between',
    gap: theme.spacing(gap),
    [theme.breakpoints.down('md')]: {
        flexDirection: 'column',
    },
}));

export const FlexItem = styled('div')<{ flex?: number; isMobile?: boolean }>(({ theme, flex, isMobile }) => ({
    flex: flex || 1,
    padding: theme.spacing(0, isMobile ? 0 : 2),
    maxWidth: isMobile ? '100%' : undefined,
    overflowX: 'auto',
}));

// Leaderboard specific
export const LeaderboardContainer = styled('div')(({ theme }) => ({
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing(2),
}));

// Chart wrapper
export const ChartWrapper = styled('div')<{ isMobile?: boolean }>(({ theme, isMobile }) => ({
    maxWidth: isMobile ? '100%' : '1200px',
    margin: 'auto',
    padding: theme.spacing(2, 0),
}));