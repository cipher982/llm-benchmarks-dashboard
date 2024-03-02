// App.tsx
// Libraries/Modules
import React, { FC } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { AppBar } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { useMediaQuery } from '@mui/material';

// Components
import Navbar from './NavBar';
import LocalBenchmarks from './pages/LocalBenchmarks';
import CloudBenchmarks from './pages/CloudBenchmarks';

// Styles
import './App.css';
import { MainContainer } from './styles';

// Main App Component
const App: FC = () => {
  const isMobile = useMediaQuery('(max-width:500px)');

  return (
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
        </Routes>
      </MainContainer>
      <Analytics />
    </Router>
  );
}

export default App;