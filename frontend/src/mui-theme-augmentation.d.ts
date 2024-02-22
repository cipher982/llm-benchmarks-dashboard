declare module '@mui/material/styles' {
    interface Theme {
        components: {
            MuiDataGrid: {
                styleOverrides?: ComponentStyleOverrides<MuiDataGrid>;
            };
        };
    }
}