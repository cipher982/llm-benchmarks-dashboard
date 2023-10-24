import React, { useEffect, useState } from "react";

function App() {
  const [benchmarks, setBenchmarks] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:5000/api/benchmarks")
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

  return (
    <div>
      {loading ? "Loading..." : null}
      {error ? `Error: ${error}` : null}
      <table>
        <thead>
          <tr>
            <th>Model Name</th>
            <th>Tokens Per Second</th>
          </tr>
        </thead>
        <tbody>
          {benchmarks.map((benchmark, index) => (
            <tr key={index}>
              <td>{benchmark.model_name}</td>
              <td>{Array.isArray(benchmark.tokens_per_second) 
                    ? benchmark.tokens_per_second.join(", ") 
                    : benchmark.tokens_per_second}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
