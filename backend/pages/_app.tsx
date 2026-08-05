import { AppProps } from 'next/app';
import { FC } from 'react';
import localFont from 'next/font/local';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import theme from '../components/theme/theme';
import Navbar from '../components/NavBar';
import SiteFooter from '../components/SiteFooter';
import '../styles/styles.css';

// Vendored under `fonts/`, not fetched.
//
// `next/font/google` resolves a family by fetching from fonts.googleapis.com
// and fonts.gstatic.com *during the build*, and a failure there is a build
// error rather than a warning. The Docker builder installs fresh and carries no
// `.next` cache, so every image build was a cold fetch against Google — a
// previously offline-capable build that would fail on a host without egress
// while passing on a laptop that had the font cached. `next/font/local` makes
// the build hermetic; refresh the files with `node scripts/vendor-fonts.mjs`.
//
// The mono carries every measured value; the sans carries model names and the
// little prose that survives. The shortlist deliberately avoids the faces that
// now read as the default output of a generated site.
const mono = localFont({
  src: [
    { path: '../fonts/IBMPlexMono-400.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/IBMPlexMono-500.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/IBMPlexMono-600.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-mono',
  display: 'swap',
});

// Google serves IBM Plex Sans as a single variable file, so one face covers the
// whole weight range the site uses.
const sans = localFont({
  src: [{ path: '../fonts/IBMPlexSans-var.woff2', weight: '400 600', style: 'normal' }],
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
