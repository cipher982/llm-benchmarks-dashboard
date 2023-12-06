// App.js
// Libraries/Modules
import React, { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppBar } from '@mui/material';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';

// Components
import Navbar from './NavBar';
import LocalBenchmarks from './LocalBenchmarks';
import CloudBenchmarks from './CloudBenchmarks';

// Styles
import './App.css';

import { MainContainer, lightPurpleTheme, darkTheme } from './theme';

// Main App Component
const App = () => {
  // Dark Mode
  const [darkMode, setDarkMode] = useState(false);
  const toggleDarkMode = () => {
    setDarkMode(prevDarkMode => !prevDarkMode);
  };
  const theme = darkMode ? darkTheme : lightPurpleTheme;

  return (
    <Router>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AppBar position="fixed" color="default">
          <Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
        </AppBar>
        <MainContainer style={{ marginTop: '-50px' }}>
          <Routes>
            <Route path="/" element={<LocalBenchmarks />} />
            <Route path="/cloud" element={<CloudBenchmarks />} />
          </Routes>
        </MainContainer>
      </ThemeProvider>
      <Analytics />
    </Router>
  );
}

export default App;