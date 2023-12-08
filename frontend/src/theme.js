// theme.js
import { createTheme, styled } from '@mui/material/styles';


// Styles
const MainContainer = styled('div')(({ theme, isMobile }) => ({
    paddingTop: isMobile ? '70px' : '30px',
    margin: isMobile ? '2px' : '10px',
    backgroundColor: theme.palette.background.default,
}));

const DescriptionSection = styled('section')(({ theme }) => ({
    color: theme.palette.text.primary,
    padding: '20px',
    backgroundColor: theme.palette.background.paper,
}));

const ChartContainer = styled('section')(({ theme }) => ({
    textAlign: 'center',
    color: theme.palette.text.primary,
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: '4px',
    padding: '20px',
    marginTop: '20px',
}));

const TableContainer = styled('section')(({ theme }) => ({
    textAlign: 'center',
    backgroundColor: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    marginTop: '20px',
    width: '100%',
}));

// Themes
const commonTheme = createTheme({
    palette: {
        primary: {
            main: '#fff',
        },
        secondary: {
            main: '#663399',
        },
        text: {
            primary: '#f9f9f9',
            secondary: '#f9f9f9',
        },
        tab: {
            light: '#000', // color for light mode
            dark: '#fff', // color for dark mode
        },
    },
    components: {
        MuiIconButton: {
            styleOverrides: {
                root: {
                    color: '#f9f9f9',
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                head: {
                    fontWeight: '700',
                },
                root: {
                    color: '#f9f9f9',
                },
            },
        },
        MuiDataGrid: {
            styleOverrides: {
                root: {
                    '& .MuiDataGrid-menuIcon': {
                        color: '#f9f9f9',
                    },
                    '& .MuiDataGrid-menuList': {
                        backgroundColor: '#f9f9f9',
                        color: '#f9f9f9',
                    },
                    '& .MuiDataGrid-columnHeaderTitle': {
                        fontWeight: 'bold',
                    },
                },
            },
        },
        MuiListItemIcon: {
            styleOverrides: {
                root: {
                    color: '#f9f9f9',
                },
            },
        },
    },
});


const lightPurpleTheme = createTheme({
    ...commonTheme,
    palette: {
        ...commonTheme.palette,
        background: {
            default: '#fff',
            paper: '#663399',
        },
    },
});

const darkTheme = createTheme({
    ...commonTheme,
    palette: {
        ...commonTheme.palette,
        mode: 'dark',
        primary: {
            main: '#000',
        },
        secondary: {
            main: '#000',
        },
        background: {
            default: '#333333',
            paper: '#000',
        },
    },
    components: {
        ...commonTheme.components,
    },
});



export { MainContainer, DescriptionSection, ChartContainer, TableContainer, lightPurpleTheme, darkTheme };