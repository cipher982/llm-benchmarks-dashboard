// Libraries/Modules
import { FC } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { AppBar, ThemeProvider } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { useMediaQuery } from '@mui/material';

// Theme
import theme from './theme/theme';

// Components
import Navbar from './NavBar';
import LocalBenchmarks from './pages/LocalBenchmarks';
import CloudBenchmarks from './pages/CloudBenchmarks';
import StatusPage from './pages/Status';

// Styles
import './App.css';
import { MainContainer } from './styles';

// Main App Component
const App: FC = () => {
  const isMobile = useMediaQuery('(max-width:500px)');

  return (
    <ThemeProvider theme={theme}>
      <Router>
        <CssBaseline />
        <AppBar position="fixed" color="default">
          <Navbar />
        </AppBar>
        <MainContainer className="MainContainer" isMobile={isMobile}>
          <Routes>
            <Route path="/" element={<Navigate to="/local" replace />} />
            <Route path="/local" element={<LocalBenchmarks />} />
            <Route path="/cloud" element={<CloudBenchmarks />} />
            <Route path="/status" element={<StatusPage />} />
          </Routes>
        </MainContainer>
        <Analytics />
      </Router>
    </ThemeProvider>
  );
}

export default App;