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
            main: '#663399',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#663399',
            contrastText: '#ffffff',
        },
        error: {
            main: '#e91e63',
        },
        background: {
            default: '#ffffff',
            paper: '#ffffff',
        },
        text: {
            primary: '#000000',
            secondary: '#666666',
        },
        divider: '#e0e0e0',
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
    spacing: 8, // Base spacing unit: 8px
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
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontSize: '2.5rem',
            fontWeight: 700,
            lineHeight: 1.2,
        },
        h2: {
            fontSize: '2rem',
            fontWeight: 600,
            lineHeight: 1.3,
        },
        h3: {
            fontSize: '1.5rem',
            fontWeight: 600,
            lineHeight: 1.4,
        },
        h4: {
            fontSize: '1.25rem',
            fontWeight: 600,
            lineHeight: 1.4,
        },
        h5: {
            fontSize: '1.125rem',
            fontWeight: 600,
            lineHeight: 1.4,
        },
        h6: {
            fontSize: '1rem',
            fontWeight: 600,
            lineHeight: 1.4,
        },
        body1: {
            fontSize: '1rem',
            lineHeight: 1.5,
        },
        body2: {
            fontSize: '0.875rem',
            lineHeight: 1.5,
        },
        caption: {
            fontSize: '0.75rem',
            lineHeight: 1.4,
        },
    },
    shape: {
        borderRadius: 8,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: '8px',
                },
            },
        },
        MuiTable: {
            styleOverrides: {
                root: {
                    borderColor: '#e0e0e0',
                },
            },
        },
        MuiTableCell: {
            styleOverrides: {
                head: {
                    fontWeight: '700',
                    backgroundColor: '#f5f5f5',
                },
                root: {
                    borderBottom: '1px solid #e0e0e0',
                },
            },
        },
        MuiListItemIcon: {
            styleOverrides: {
                root: {
                    color: '#663399',
                },
            },
        },
        MuiCssBaseline: {
            styleOverrides: `
                  .MuiDataGrid-root {
                    border: 1px solid #e0e0e0;
                    & .MuiDataGrid-columnHeaders {
                      background-color: #f5f5f5;
                      border-bottom: 2px solid #e0e0e0;
                    }
                    & .MuiDataGrid-cell {
                      border-bottom: 1px solid #f0f0f0;
                    }
                    & .MuiDataGrid-columnSeparator {
                      color: #e0e0e0;
                    }
                  }
                `,
        },
    },
});

export default theme;

