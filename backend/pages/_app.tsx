import { AppProps } from 'next/app';
import { FC } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import AppBar from '@mui/material/AppBar';
import { ThemeProvider } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import theme from '../components/theme/theme';
import Navbar from '../components/NavBar';
import { MainContainer } from '../components/design-system/components';
import '../styles/styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const MyApp: FC<AppProps> = ({ Component, pageProps }) => {
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppBar position="fixed" color="default">
          <Navbar />
        </AppBar>
        <MainContainer className="MainContainer" isMobile={isMobile}>
          <Component {...pageProps} />
        </MainContainer>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default MyApp;