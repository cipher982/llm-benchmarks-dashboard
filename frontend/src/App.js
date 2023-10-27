import React, { useEffect, useState } from "react";
import 'font-awesome/css/font-awesome.min.css';

function App() {
  const [benchmarks, setBenchmarks] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://llm-bench-back.fly.dev/api/benchmarks")
      .then((res) => res.json())
      .then((data) => {
        console.log("Fetched data:", data);
        setBenchmarks(data);
        setLoading(false);
      })
      .catch((error) => {
        console.log("Error fetching benchmark data:", error);
        setError(error.toString());
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
      <table className="benchmark-table">
        <thead>
          <tr>
            <th>Model Name</th>
            <th>Tokens/Second</th>
            <th>GPU Memory</th>
            <th>Quantization</th>
            <th>Torch DType</th>
          </tr>
        </thead>
        <tbody>
          {benchmarks.map((benchmark, index) => (
            <tr key={index}>
              <td>{benchmark.model_name}</td>
              <td>{calculateMean(benchmark.tokens_per_second).toFixed(2)}</td>
              <td>{bytesToGB(calculateMean(benchmark.gpu_mem_usage)).toFixed(2) + " GB" || "None"}</td>
              <td>{benchmark.quantization_bits || "None"}</td>
              <td>{benchmark.torch_dtype}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  
  
}

export default App;
