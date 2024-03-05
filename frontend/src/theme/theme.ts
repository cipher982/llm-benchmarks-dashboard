import { createTheme } from '@mui/material/styles';


const theme = createTheme({
    palette: {
        mode: 'dark', // Set theme mode to dark
        primary: {
            main: '#663399',
            contrastText: '#ffffff',
        },
        secondary: {
            main: "#ffffff",
            contrastText: '#000000',
        },
        error: { // Repurposing 'error' as 'accent'
            main: '#e91e63',
        },
        background: {
            default: "#ffffff",
            paper: "#663399",
        },
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: '8px', // Rounded corners for buttons
                },
            },
        },
        MuiTable: {
            styleOverrides: {
                root: {
                    borderColor: '#ffffff', // Adjusting table border color
                    // Add other styling as needed
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
        MuiListItemIcon: {
            styleOverrides: {
                root: {
                    color: '#f9f9f9',
                },
            },
        },
        MuiCssBaseline: {
            styleOverrides: `
                  .MuiDataGrid-root {
                    color: '#ffffff';
                    borderColor: '#ffffff';
                    & .MuiDataGrid-columnHeaders {
                      color: '#ffffff';
                    }
                    & .MuiDataGrid-cell {
                      color: '#ffffff';
                    }
                    & .MuiDataGrid-columnSeparator {
                      color: '#ffffff';
                    }
                  }
                `,
        },
    },
});

export default theme;