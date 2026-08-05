import { AppProps } from 'next/app';
import { FC } from 'react';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import theme from '../components/theme/theme';
import Navbar from '../components/NavBar';
import SiteFooter from '../components/SiteFooter';
import '../styles/styles.css';

// Self-hosted at build time, so no request leaves the page for a font. The
// shortlist deliberately avoids the faces that now read as the default output
// of a generated site. The mono carries every measured value; the sans carries
// model names and the little prose that survives.
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (renamed from cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const MyApp: FC<AppProps> = ({ Component, pageProps }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* NavBar positions itself; it is not an MUI AppBar, which brought its
            own elevation and background along with it. */}
        <div className={`${mono.variable} ${sans.variable}`}>
          <Navbar />
          <div className="MainContainer">
            <Component {...pageProps} />
          </div>
          <SiteFooter />
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default MyApp;
