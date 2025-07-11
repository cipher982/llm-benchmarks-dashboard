import { styled } from '@mui/material/styles';

interface MainContainerProps {
    isMobile: boolean;
}

// Styles - Updated to use theme parameter properly
const MainContainer = styled('div')<MainContainerProps>(({ theme, isMobile }) => ({
    paddingTop: isMobile ? '70px' : '30px',
    margin: isMobile ? '2px' : '10px',
    backgroundColor: theme.palette.background.default,
}));

const DescriptionSection = styled('section')<MainContainerProps>(({ theme, isMobile }) => ({
    textAlign: 'center',
    padding: theme.spacing(3),
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
}));

const ChartContainer = styled('section')<MainContainerProps>(({ theme, isMobile }) => ({
    textAlign: 'center',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(3),
    marginTop: theme.spacing(3),
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.background.paper,
}));

const TableContainer = styled('section')<MainContainerProps>(({ theme, isMobile }) => ({
    textAlign: 'center',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    marginTop: theme.spacing(3),
    width: '100%',
    backgroundColor: theme.palette.background.paper,
    padding: theme.spacing(2),
}));

export { MainContainer, DescriptionSection, ChartContainer, TableContainer };