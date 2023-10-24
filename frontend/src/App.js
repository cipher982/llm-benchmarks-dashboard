import React, { useEffect, useState } from "react";

function App() {
  const [data, setData] = useState(null);
  const [benchmarks, setBenchmarks] = useState([]);


  useEffect(() => {
    // Fetch data from your Express.js API here
    fetch("http://localhost:5000/api/benchmarks")
      .then((res) => res.json())
      .then((data) => setData(data));
  }, []);

  return (
    <div>
      {data ? data.message : "Loading..."}
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
              <td>{benchmark.tokens_per_second}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;
