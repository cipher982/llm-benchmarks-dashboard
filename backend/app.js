const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const BenchmarkMetrics = require("./models/BenchmarkMetrics");  // Adjust the path as needed


// Enable CORS for all routes
app.use(cors());

// Connect to MongoDB
mongoose.connect("mongodb://jelly:27017/llm_benchmarks", { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));


// New route to fetch data from MongoDB
app.get("/api/benchmarks", async (req, res) => {
  try {
    const metrics = await BenchmarkMetrics.find({});
    res.json(metrics);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
