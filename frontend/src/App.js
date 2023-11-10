// Libraries/Modules
import React, { useState, useEffect } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Button from '@mui/material/Button';

// Components
import BenchScatterChart from './BenchScatterChart';
import BenchmarksTable from './BenchTable';

// Utilities/Functions
import { calculateMean, bytesToGB } from './utils';

// Styles
import 'font-awesome/css/font-awesome.min.css';
import './App.css';


const App = () => {
  const [benchmarks, setBenchmarks] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const filteredBenchmarks = benchmarks.filter(benchmark => benchmark.gpu_mem_usage > 1);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  const darkTheme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
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

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };


  return (
    <ThemeProvider theme={darkTheme}>
      <div className="main-container">
        <Button variant="contained" color={darkMode ? "primary" : "secondary"} onClick={toggleDarkMode} size="small">
          {darkMode ? '☀️' : '🌒'}
        </Button>
        <h1>LLM Benchmarks</h1>
        <p>This project aims to benchmark popular LLM frameworks in various configurations.</p>
        <section className="system-specs">
          <h3>System Specifications:</h3>
          <p>GPU: NVIDIA GeForce RTX 3090</p>
          <p>CPU: Intel Core i9-12900K</p>
        </section>
        <div className="github-link">
          <a href="https://github.com/cipher982/llm-benchmarks" target="_blank" rel="noopener noreferrer">
            <i className="fa fa-github fa-2x"></i>
          </a>
        </div>

        <section className="chart-container">
          <h4>GPU Usage vs Tokens/Second</h4>
          {/* Chart Component */}
          {benchmarks.length > 0 && (
            <BenchScatterChart
              data_tf={filteredBenchmarks.filter(benchmark => benchmark.framework === 'transformers')}
              data_gguf={filteredBenchmarks.filter(benchmark => benchmark.framework === 'gguf')}
            />
          )}
        </section>

        <section className="table-container">
          <h4>Raw Results</h4>
          <BenchmarksTable benchmarks={benchmarks} darkMode={darkMode} />
        </section>
      </div>
    </ThemeProvider>
  );
}

export default App;