// Libraries/Modules
import { FC } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import AppBar from '@mui/material/AppBar';
import { ThemeProvider } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';

// Theme
import theme from './theme/theme';

// Components
import Navbar from './NavBar';
import CloudBenchmarks from './pages/CloudBenchmarks';
import LocalBenchmarks from './pages/LocalBenchmarks';
import StatusPage from './pages/Status';
import ModelDetail from './pages/ModelDetail';

// Styles
import './App.css';
import { MainContainer } from './styles';

// Main App Component
const App: FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <ThemeProvider theme={theme}>
      <Router>
        <CssBaseline />
        <AppBar position="fixed" color="default">
          <Navbar />
        </AppBar>
        <MainContainer className="MainContainer" isMobile={isMobile}>
          <Routes>
            <Route path="/" element={<Navigate to="/cloud" replace />} />
            <Route path="/local" element={<LocalBenchmarks />} />
            <Route path="/cloud" element={<CloudBenchmarks />} />
            <Route path="/models/:provider/:model" element={<ModelDetail />} />
            <Route path="/status" element={<StatusPage />} />
          </Routes>
        </MainContainer>
        <Analytics />
      </Router>
    </ThemeProvider>
  );
}

export default App;