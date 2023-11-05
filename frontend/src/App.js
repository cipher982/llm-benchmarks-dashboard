import React, { useState, useEffect } from "react";
import { DataGrid } from "@mui/x-data-grid";
import "./App.css";
import "font-awesome/css/font-awesome.min.css";


const columns = [
  { field: "framework", headerName: "Framework", width: 150 },
  { field: "model_name", headerName: "Model Name", width: 200 },
  { field: "tokens_per_second", headerName: "Tokens/Second", type: "number", width: 100 },
  { field: "gpu_mem_usage", headerName: "GPU Memory", type: "number", width: 150 },
  { field: "quantization_bits", headerName: "Quantization", width: 150 },
  { field: "model_dtype", headerName: "Model DType", width: 150 }
];


const App = () => {
  const [benchmarks, setBenchmarks] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://llm-bench-back.fly.dev/api/benchmarks")
      .then((res) => res.json())
      .then((data) => {
        const transformedBenchmarks = data
          .filter(benchmark => benchmark.tokens_per_second.length > 0 && benchmark.gpu_mem_usage.length > 0)
          .map((benchmark, index) => ({
            id: index,
            framework: benchmark.framework,
            model_name: benchmark.model_name,
            tokens_per_second: parseFloat(calculateMean(benchmark.tokens_per_second).toFixed(2)),
            gpu_mem_usage: parseFloat(bytesToGB(calculateMean(benchmark.gpu_mem_usage)).toFixed(2)),
            quantization_bits: benchmark.quantization_bits && benchmark.quantization_bits !== "unknown" ? benchmark.quantization_bits : "None",
            model_dtype: benchmark.model_dtype
          }));
        setBenchmarks(transformedBenchmarks);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.toString());
        setLoading(false);
      });
  }, []);

  // Function to calculate the mean of an array
  const calculateMean = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const sum = arr.reduce((a, b) => a + b, 0);
    return sum / arr.length;
  };

  // Function to convert bytes to GB
  const bytesToGB = (bytes) => {
    return bytes / (1024 * 1024 * 1024);
  };

  return (
    <div className="container">
      <h1>LLM Benchmarks</h1>
      <p>This project aims to benchmark the popular HuggingFace language models under various configurations.</p>
      <div className="system-specs">
        <h3>System Specifications:</h3>
        <p>GPU: NVIDIA GeForce RTX 3090</p>
        <p>CPU: Intel Core i9-12900K</p>
      </div>
      <a href="https://github.com/cipher982/llm-benchmarks" target="_blank" rel="noopener noreferrer">
        <i className="fa fa-github fa-2x"></i>
      </a>
      {loading ? <div className="loading">Loading...</div> : null}
      {error ? <div className="error">`Error: ${error}`</div> : null}

      <DataGrid
        rows={benchmarks}
        columns={columns}
        pageSizeOptions={[10, 25]}
        checkboxSelection
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 10 },
          },
        }}
      />
    </div>
  );


}

export default App;
