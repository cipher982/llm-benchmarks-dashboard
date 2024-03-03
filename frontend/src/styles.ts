import { CSSObject, styled, useTheme } from '@mui/system';

interface MainContainerProps {
    isMobile: boolean;
}

// Styles
const MainContainer = styled('div')<MainContainerProps>(({ isMobile }): CSSObject => {
    const theme = useTheme();
    return {
        paddingTop: isMobile ? '70px' : '30px',
        margin: isMobile ? '2px' : '10px',
        backgroundColor: theme.palette.background.default, // Using theme for backgroundColor
    };
});

const DescriptionSection = styled('section')<MainContainerProps>(({ isMobile }): CSSObject => {
    const theme = useTheme();
    return {
        textAlign: 'center',
        padding: '20px',
        color: theme.palette.text.primary, // Using theme for text color
        backgroundColor: theme.palette.background.paper, // Using theme for backgroundColor
    };
});

const ChartContainer = styled('section')<MainContainerProps>(({ isMobile }): CSSObject => {
    const theme = useTheme();
    return {
        textAlign: 'center',
        border: `1px solid ${theme.palette.divider}`, // Using theme for border color
        borderRadius: '4px',
        padding: '20px',
        marginTop: '20px',
        color: theme.palette.text.primary, // Using theme for text color
        backgroundColor: theme.palette.background.paper, // Using theme for backgroundColor
    };
});

const TableContainer = styled('section')<MainContainerProps>(({ isMobile }): CSSObject => {
    const theme = useTheme();
    return {
        textAlign: 'center',
        border: `1px solid ${theme.palette.divider}`, // Using theme for border color
        marginTop: '20px',
        width: '100%',
        backgroundColor: theme.palette.background.paper, // Using theme for backgroundColor
    };
});

export { MainContainer, DescriptionSection, ChartContainer, TableContainer };