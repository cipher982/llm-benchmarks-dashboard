import { createTheme } from '@mui/material/styles';

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
}

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
    [Provider.Google]: "#4285F4",
};


const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#663399',
            contrastText: '#ffffff',
        },
        secondary: {
            main: "#ffffff",
            contrastText: '#000000',
        },
        error: {
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
                    borderRadius: '8px',
                },
            },
        },
        MuiTable: {
            styleOverrides: {
                root: {
                    borderColor: '#ffffff',
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

