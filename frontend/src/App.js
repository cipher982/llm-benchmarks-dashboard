// Libraries/Modules
import React, { useState, useEffect } from 'react';
import { createTheme, ThemeProvider, styled } from '@mui/material/styles';
import Button from '@mui/material/Button';
import CssBaseline from '@mui/material/CssBaseline';

// Components
import BenchScatterChart from './BenchScatterChart';
import BenchmarksTable from './BenchTable';

// Utilities/Functions
import { calculateMean, bytesToGB } from './utils';

// Styles
import 'font-awesome/css/font-awesome.min.css';
import './App.css';


// Styled Components
const MainContainer = styled('div')(({ theme }) => ({
  margin: '20px',
  backgroundColor: theme.palette.background.default,
}));

const GitHubLink = styled('div')(({ theme }) => ({
  textAlign: 'left',
  margin: '20px 0',
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
  border: `1px solid ${theme.palette.divider}`,
  marginTop: '20px',
  width: '100%',
}));


// Main App Component
const App = () => {
  const [benchmarks, setBenchmarks] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const filteredBenchmarks = benchmarks.filter(benchmark => benchmark.gpu_mem_usage > 1);
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const darkTheme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: darkMode ? '#0a0a0d' : '#f4f8ffb9',
            color: darkMode ? '#f9f9f9' : '#333',
          },
        },
      },
    },
  });

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
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div style={{ display: "flex", justifyContent: "left", alignItems: "center" }}>
        <Button
          variant="contained"
          color={darkMode ? "primary" : "secondary"}
          onClick={toggleDarkMode}
          size="small"
          style={{ marginLeft: "20px", marginRight: "20px" }}
        >
          {darkMode ? '☀️' : '🌒'}
        </Button>
        <GitHubLink>
          <a href="https://github.com/cipher982/llm-benchmarks" target="_blank" rel="noopener noreferrer">
            <i className="fa fa-github fa-2x"></i>
          </a>
        </GitHubLink>
      </div>
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