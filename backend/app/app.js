// Import required modules
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

const BenchmarkMetrics = require("./models/BenchmarkMetrics");


app.use(cors());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log(err));

// Route to fetch data
app.get("/api/benchmarks", async (req, res) => {
  try {
    const metrics = await BenchmarkMetrics.find({});
    res.json(metrics);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Internal server error" });
  }
});


// Start server
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
