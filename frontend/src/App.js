// Libraries/Modules
import React, { useState, useEffect } from 'react';
import { createTheme, ThemeProvider, styled } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppBar } from '@mui/material';

// Components
import BenchScatterChart from './BenchScatterChart';
import BenchmarksTable from './BenchTable';
import Navbar from './NavBar';

// Utilities/Functions
import { calculateMean, bytesToGB } from './utils';

// Styles
import './App.css';

const MainContainer = styled('div')(({ theme }) => ({
  paddingTop: '50px',
  margin: '20px',
  backgroundColor: theme.palette.background.default,
}));

const DescriptionSection = styled('section')(({ theme }) => ({
  color: theme.palette.text.primary,
  padding: '20px',
  backgroundColor: theme.palette.background.paper,
}));

const ChartContainer = styled('section')(({ theme }) => ({
  textAlign: 'center',
  color: theme.palette.text.primary,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: '4px',
  padding: '20px',
  marginTop: '20px',
}));

const TableContainer = styled('section')(({ theme }) => ({
  textAlign: 'center',
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  marginTop: '20px',
  width: '100%',
}));

// Themes
const lightPurpleTheme = createTheme({
  palette: {
    primary: {
      main: '#fff',
    },
    secondary: {
      main: '#663399',
    },
    background: {
      default: '#fff',
      paper: '#663399',
    },
    text: {
      primary: '#f9f9f9',
      secondary: '#f9f9f9',
    },
  },
  // ... [any other theme customizations]
});

const darkTheme = createTheme({
  ...lightPurpleTheme,
  palette: {
    ...lightPurpleTheme.palette,
    mode: 'dark',
    primary: {
      main: '#000',
    },
    secondary: {
      main: '#000',
    },
    background: {
      default: '#333333',
      paper: '#000',
    },
    text: {
      primary: '#f9f9f9',
      secondary: '#f9f9f9',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#333333',
          color: '#f9f9f9',
        },
      },
    },
  },
});


// Main App Component
const App = () => {
  const [benchmarks, setBenchmarks] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const filteredBenchmarks = benchmarks.filter(benchmark => benchmark.gpu_mem_usage > 1);
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(prevDarkMode => !prevDarkMode);
  };

  const theme = darkMode ? darkTheme : lightPurpleTheme;

  useEffect(() => {
    fetch("https://llm-bench-back.fly.dev/api/benchmarks")
      // fetch("http://localhost:5000/api/benchmarks")
      .then((res) => res.json())
      .then((data) => {
        const transformedBenchmarks = data
          .filter(benchmark => benchmark.tokens_per_second.length > 0 && benchmark.gpu_mem_usage.length > 0)
          .map((benchmark, index) => {
            const rawModelSize = benchmark.model_size;
            return {
              id: index,
              framework: benchmark.framework,
              model_name: benchmark.model_name,
              model_size: rawModelSize,
              formatted_model_size: rawModelSize ? rawModelSize.toLocaleString() : "N/A",
              tokens_per_second: parseFloat(calculateMean(benchmark.tokens_per_second).toFixed(2)),
              gpu_mem_usage: parseFloat(bytesToGB(calculateMean(benchmark.gpu_mem_usage)).toFixed(2)),
              quantization_bits: benchmark.quantization_bits && benchmark.quantization_bits !== "unknown" ? benchmark.quantization_bits : "None",
              model_dtype: benchmark.model_dtype
            };
          });
        setBenchmarks(transformedBenchmarks);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.toString());
        setLoading(false);
      });
  }, []);


  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="fixed">
        <Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      </AppBar>
      <MainContainer>
        <DescriptionSection>
          <h1>LLM Benchmarks</h1>
          <p>This project aims to benchmark popular LLM frameworks in various configurations.</p>
          <h3>System Specifications:</h3>
          <p>GPU: NVIDIA GeForce RTX 3090</p>
          <p>CPU: Intel Core i9-12900K</p>
        </DescriptionSection>
        <ChartContainer>
          <h4>GPU Usage vs Tokens/Second</h4>
          {benchmarks.length > 0 && (
            <BenchScatterChart
              theme={theme}
              data_tf={filteredBenchmarks.filter(benchmark => benchmark.framework === 'transformers')}
              data_gguf={filteredBenchmarks.filter(benchmark => benchmark.framework === 'gguf')}
            />
          )}
        </ChartContainer>

        <TableContainer>
          <h4>Raw Results</h4>
          <BenchmarksTable benchmarks={benchmarks} darkMode={darkMode} />
        </TableContainer>

      </MainContainer>
    </ThemeProvider>
  );
}

export default App;