import '@mui/material/styles';

declare module '@mui/material/styles' {
    interface Theme {
        companyColors: {
            [key: string]: string;
        };
    }
    // allow configuration using `createTheme`
    interface ThemeOptions {
        companyColors?: {
            [key: string]: string;
        };
    }
}