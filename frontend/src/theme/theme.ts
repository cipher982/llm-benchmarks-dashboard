import { createTheme } from '@mui/material/styles';

// Extend MUI theme to include provider colors
declare module '@mui/material/styles' {
    interface Palette {
        providers: {
            anthropic: string;
            azure: string;
            anyscale: string;
            openai: string;
            bedrock: string;
            mistral: string;
            groq: string;
            together: string;
            perplexity: string;
            fireworks: string;
            lepton: string;
            deepinfra: string;
            nvidia: string;
            runpod: string;
            google: string;
            lambda: string;
        };
    }

    interface PaletteOptions {
        providers?: {
            anthropic?: string;
            azure?: string;
            anyscale?: string;
            openai?: string;
            bedrock?: string;
            mistral?: string;
            groq?: string;
            together?: string;
            perplexity?: string;
            fireworks?: string;
            lepton?: string;
            deepinfra?: string;
            nvidia?: string;
            runpod?: string;
            google?: string;
            lambda?: string;
        };
    }
}

export enum Provider {
    Anthropic = "anthropic",
    Azure = "azure",
    Anyscale = "anyscale",
    OpenAI = "openai",
    Bedrock = "bedrock",
    Mistral = "mistral",
    Groq = "groq",
    Together = "together",
    Perplexity = "perplexity",
    Fireworks = "fireworks",
    Lepton = "lepton",
    Deepinfra = "deepinfra",
    Nvidia = "nvidia",
    Runpod = "runpod",
    Google = "google",
    Lambda = "lambda",
}

// Helper function to get provider color from theme
export const getProviderColor = (theme: any, provider: Provider): string => {
    return theme.palette.providers[provider] || theme.palette.primary.main;
};

// Legacy export for backwards compatibility - will be removed after refactoring
export const providerColors: Record<Provider, string> = {
    [Provider.Anthropic]: "#C07C62",
    [Provider.Azure]: "#0078D4",
    [Provider.Anyscale]: "#143566",
    [Provider.OpenAI]: "#1F1F1F",
    [Provider.Bedrock]: "#FF9900",
    [Provider.Mistral]: "#FD6F00",
    [Provider.Groq]: "#D46645",
    [Provider.Together]: "#0E6EFF",
    [Provider.Perplexity]: "#1B818E",
    [Provider.Fireworks]: "#C02390",
    [Provider.Lepton]: "#467EE5",
    [Provider.Deepinfra]: "#5798DC",
    [Provider.Nvidia]: "#85B737",
    [Provider.Runpod]: "#673AB7",
    [Provider.Google]: "#33a852",
    [Provider.Lambda]: "#4027ff",
};


const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#000080', // Windows 98 accent blue
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#404040', // Panel dark color
            contrastText: '#ffffff',
        },
        error: {
            main: '#800000', // Windows 98 error red
        },
        background: {
            default: '#C0C0C0', // Classic Windows 98 gray
            paper: '#FFFFFF',    // Window background
        },
        text: {
            primary: '#000000',
            secondary: '#404040',
        },
        divider: '#404040',
        // Provider-specific colors integrated into theme
        providers: {
            anthropic: '#C07C62',
            azure: '#0078D4',
            anyscale: '#143566',
            openai: '#1F1F1F',
            bedrock: '#FF9900',
            mistral: '#FD6F00',
            groq: '#D46645',
            together: '#0E6EFF',
            perplexity: '#1B818E',
            fireworks: '#C02390',
            lepton: '#467EE5',
            deepinfra: '#5798DC',
            nvidia: '#85B737',
            runpod: '#673AB7',
            google: '#33a852',
            lambda: '#4027ff',
        },
    },
    spacing: 4, // Base spacing unit: 4px (Windows 98 style)
    breakpoints: {
        values: {
            xs: 0,
            sm: 600,
            md: 960,
            lg: 1280,
            xl: 1920,
        },
    },
    typography: {
        fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
        h1: {
            fontSize: '1.5rem',
            fontWeight: 400,
            lineHeight: 1.2,
        },
        h2: {
            fontSize: '1.25rem',
            fontWeight: 400,
            lineHeight: 1.3,
        },
        h3: {
            fontSize: '1.125rem',
            fontWeight: 400,
            lineHeight: 1.4,
        },
        h4: {
            fontSize: '1rem',
            fontWeight: 400,
            lineHeight: 1.4,
        },
        h5: {
            fontSize: '0.875rem',
            fontWeight: 400,
            lineHeight: 1.4,
        },
        h6: {
            fontSize: '0.75rem',
            fontWeight: 400,
            lineHeight: 1.4,
        },
        body1: {
            fontSize: '0.75rem',
            lineHeight: 1.4,
        },
        body2: {
            fontSize: '0.6875rem',
            lineHeight: 1.4,
        },
        caption: {
            fontSize: '0.625rem',
            lineHeight: 1.3,
        },
    },
    shape: {
        borderRadius: 0, // Windows 98 sharp corners
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: '0px',
                    border: '2px outset #DFDFDF',
                    backgroundColor: '#DFDFDF',
                    color: '#000000',
                    fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    minHeight: '24px',
                    padding: '2px 8px',
                    '&:hover': {
                        backgroundColor: '#DFDFDF',
                        border: '2px outset #DFDFDF',
                    },
                    '&:active': {
                        border: '2px inset #DFDFDF',
                    },
                },
                containedPrimary: {
                    backgroundColor: '#000080',
                    color: '#FFFFFF',
                    border: '2px outset #000080',
                    '&:hover': {
                        backgroundColor: '#000080',
                        border: '2px outset #000080',
                    },
                    '&:active': {
                        border: '2px inset #000080',
                    },
                },
            },
        },
        MuiTable: {
            styleOverrides: {
                root: {
                    borderColor: '#404040',
                    border: '1px solid #404040',
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                head: {
                    fontWeight: '400',
                    backgroundColor: '#DFDFDF',
                    borderBottom: '1px solid #404040',
                    fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
                    fontSize: '0.75rem',
                },
                root: {
                    borderBottom: '1px solid #404040',
                    fontFamily: '"MS Sans Serif", Tahoma, sans-serif',
                    fontSize: '0.75rem',
                    padding: '4px 8px',
                },
            },
        },
        MuiListItemIcon: {
            styleOverrides: {
                root: {
                    color: '#000080',
                },
            },
        },
        MuiCssBaseline: {
            styleOverrides: `
                  .MuiDataGrid-root {
                    border: 1px solid #404040;
                    font-family: "MS Sans Serif", Tahoma, sans-serif;
                    font-size: 0.75rem;
                    background-color: #FFFFFF;
                    & .MuiDataGrid-columnHeaders {
                      background-color: #DFDFDF;
                      border-bottom: 2px solid #404040;
                      font-weight: 400;
                    }
                    & .MuiDataGrid-cell {
                      border-bottom: 1px solid #404040;
                      border-right: 1px solid #404040;
                    }
                    & .MuiDataGrid-columnSeparator {
                      color: #404040;
                    }
                  }
                `,
        },
    },
});

export default theme;

