import '@mui/material/styles';

declare module '@mui/material/styles' {
    interface Palette {
        tab?: PaletteColor;
    }
    interface PaletteOptions {
        tab?: PaletteColorOptions;
    }
}