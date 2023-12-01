// App.js
// Libraries/Modules
import React, { useState, useEffect } from 'react';
import { createTheme, ThemeProvider, styled } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AppBar } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';

// Components
import BenchScatterChart from './BenchScatterChart';
import BenchmarksTable from './BenchTable';
import ComparisonTable from './ComparisonTable';
import Navbar from './NavBar';

// Utilities/Functions
import { transformBenchmarks, getComparisonAndFastestFrameworks } from './transformations';

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
const commonTheme = createTheme({
  palette: {
    primary: {
      main: '#fff',
    },
    secondary: {
      main: '#663399',
    },
    text: {
      primary: '#f9f9f9',
      secondary: '#f9f9f9',
    },
  },
  components: {
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: '#f9f9f9',
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
    MuiDataGrid: {
      styleOverrides: {
        root: {
          '& .MuiDataGrid-menuIcon': {
            color: '#f9f9f9',
          },
          '& .MuiDataGrid-menuList': {
            backgroundColor: '#f9f9f9',
            color: '#f9f9f9',
          },
          '& .MuiDataGrid-columnHeaderTitle': {
            fontWeight: 'bold',
          },
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
  },
});


const lightPurpleTheme = createTheme({
  ...commonTheme,
  palette: {
    ...commonTheme.palette,
    background: {
      default: '#fff',
      paper: '#663399',
    },
  },
});

const darkTheme = createTheme({
  ...commonTheme,
  palette: {
    ...commonTheme.palette,
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
  },
});


// Main App Component
const App = () => {
  const [benchmarks, setBenchmarks] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);
  const [fastestFrameworks, setFastestFrameworks] = useState([]);
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
      .then((res) => res.json())
      .then((data) => {
        const dedupedBenchmarksArray = transformBenchmarks(data);
        setBenchmarks(dedupedBenchmarksArray);
        const { comparisonResults, fastestFrameworks } = getComparisonAndFastestFrameworks(dedupedBenchmarksArray);
        setComparisonData(comparisonResults);
        setFastestFrameworks(fastestFrameworks);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.toString());
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </div>
    );
  }
  if (error) return <div>Error: {error}</div>;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="fixed">
        <Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
      </AppBar>
      <MainContainer>
        <DescriptionSection>
          <h1 style={{ textAlign: "center" }}>🚄 LLM Benchmarks 🏎️</h1>
          <p>
            This project aims to benchmark popular LLM frameworks in various configurations.
            This project uses a combination of docker containers with various frameworks
            (vLLM, Transformers, Text-Generation-Inference, llama-cpp) to automate the
            benchmarks and then upload the results to the dashboard.
            Most frameworks fetch the models from the HuggingFace Hub (most downloaded or trending)
            and cache them to my server storage which allows them to be loaded on-demand.
            The exception is the llama-cpp/GGUF framework that requires specially compiled
            model formats unique to the framework.
          </p>
          <p>
            The dashboard is built with React and Node and is hosted through Vercel.
            The backend pulls from MongoDB to store all the results.
          </p>
          <h3>System Specs ⚡️</h3>
          <p>GPU: NVIDIA RTX 3090</p>
          <p>CPU: Intel Core i9-12900K</p>
        </DescriptionSection>
        <ChartContainer>
          <h3>📊 Charts 📊</h3>
          <h4>GPU Usage vs Tokens/Second</h4>
          {benchmarks.length > 0 && (
            <BenchScatterChart
              theme={theme}
              data_tf={filteredBenchmarks.filter(benchmark => benchmark.framework === 'transformers')}
              data_gguf={filteredBenchmarks.filter(benchmark => benchmark.framework === 'gguf')}
              data_hftgi={filteredBenchmarks.filter(benchmark => benchmark.framework === 'hf-tgi')}
              data_vllm={filteredBenchmarks.filter(benchmark => benchmark.framework === 'vllm')}
            />
          )}
        </ChartContainer>

        <TableContainer>
          <h3>🏆 Comparisons 🏆</h3>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ flex: 0.3, display: "flex", flexDirection: "column", justifyContent: "center", marginRight: "10px" }}>
              <h4>Leaderboard </h4>
              {
                ["🥇 1st", "🥈 2nd", "🥉 3rd"].map((place, index) => {
                  const [framework = "transformers", score = "0"] = Object.entries(fastestFrameworks)[index] || [];
                  return (
                    <p key={index}>{`${place}: ${framework} (${score})`}</p>
                  );
                })
              }
            </div>
            <div style={{ flex: 0.7, paddingRight: "20px", paddingBottom: "20px" }}>
              <h4>Comparison Table</h4>
              <ComparisonTable comparisonData={comparisonData} />
            </div>
          </div>
        </TableContainer>

        <TableContainer>
          <h4>📚 Full Results 📚</h4>
          <div style={{ height: '500px', overflow: 'auto', padding: '20px' }}>
            <BenchmarksTable
              benchmarks={benchmarks}
              darkMode={darkMode}
            />
          </div>
        </TableContainer>

      </MainContainer>
    </ThemeProvider>
  );
}

export default App;