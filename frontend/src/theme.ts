import { Theme as MuiTheme } from '@mui/material/styles';
import { createTheme } from '@mui/material';
import { CSSObject, styled } from '@mui/system';

interface CustomTheme extends MuiTheme {
    palette: {
        primary: { main: string };
        secondary: { main: string };
        text: { primary: string; secondary?: string };
        background: { default: string; paper: string };
        tab?: { light: string; dark: string };
        divider?: string;
        mode?: 'light' | 'dark';
    };
    components: {
        MuiIconButton?: { styleOverrides?: any };
        MuiTableCell?: { styleOverrides?: any };
        MuiDataGrid: {
            styleOverrides?: {
                root?: any;
            };
        };
        MuiListItemIcon?: { styleOverrides?: any };
    };
}

interface MainContainerProps {
    theme: CustomTheme;
    isMobile: boolean;
}

// Common style generator to reduce redundancy
const commonSectionStyles = (theme: CustomTheme): CSSObject => ({
    textAlign: 'center',
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.background.paper,
});

// Styles
const MainContainer = styled('div')<MainContainerProps>(({ theme, isMobile }): CSSObject => ({
    paddingTop: isMobile ? '70px' : '30px',
    margin: isMobile ? '2px' : '10px',
    backgroundColor: theme.palette.background.default,
}));

const DescriptionSection = styled('section')<{ theme: CustomTheme }>(({ theme }): CSSObject => ({
    ...commonSectionStyles(theme),
    padding: '20px',
}));

const ChartContainer = styled('section')<{ theme: CustomTheme }>(({ theme }): CSSObject => ({
    ...commonSectionStyles(theme),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: '4px',
    padding: '20px',
    marginTop: '20px',
}));

const TableContainer = styled('section')<{ theme: CustomTheme }>(({ theme }): CSSObject => ({
    ...commonSectionStyles(theme),
    border: `1px solid ${theme.palette.divider}`,
    marginTop: '20px',
    width: '100%',
}));

// Themes
const commonTheme = createTheme({
    palette: {
        primary: { main: '#fff' },
        secondary: { main: '#663399' },
        text: { primary: '#f9f9f9', secondary: '#f9f9f9' },
        // tab: { light: '#000', dark: '#fff' },
    },
    components: {
        MuiIconButton: { styleOverrides: { root: { color: '#f9f9f9' } } },
        MuiTableCell: { styleOverrides: { head: { fontWeight: '700' }, root: { color: '#f9f9f9' } } },
        // MuiDataGrid: {
        //     styleOverrides: {
        //         root: {
        //             "& .MuiDataGrid-menuIcon, & .MuiDataGrid-menuList": { color: '#f9f9f9', backgroundColor: '#f9f9f9' },
        //             "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 'bold' }
        //         }
        //     }
        // },
        MuiListItemIcon: { styleOverrides: { root: { color: '#f9f9f9' } } },
    },
});

const lightPurpleTheme = createTheme({
    ...commonTheme,
    palette: {
        background: { default: '#fff', paper: '#663399' },
    },
});

const darkTheme = createTheme({
    ...commonTheme,
    palette: {
        mode: 'dark',
        primary: { main: '#000' },
        secondary: { main: '#000' },
        background: { default: '#333333', paper: '#000' },
        divider: '#f9f9f9',
    },
});

export { MainContainer, DescriptionSection, ChartContainer, TableContainer, lightPurpleTheme, darkTheme };