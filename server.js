require('dotenv').config(); // must be first line

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const ordersRoutes = require("./routes/orders");
const stocksRoutes = require("./routes/stocks");
const usersRoutes = require("./routes/users");
const debtsRoutes = require("./routes/debts");
const db = require("./config/db"); // import DB

const app = express();
app.use(cors());
app.use(bodyParser.json());

// API routes
app.use("/orders", ordersRoutes);
app.use("/stocks", stocksRoutes);
app.use("/users", usersRoutes);
app.use("/debts", debtsRoutes);
app.use("/uploads", express.static("public/uploads"));

// Root and health check routes
app.get("/", (req, res) => res.send("Backend is running 🚀"));
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

// Start server immediately
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on 0.0.0.0:${PORT}`);
});

// Optional: retry DB connection in background
const connectWithRetry = () => {
  db.connect((err) => {
    if (err) {
      console.error("❌ DB connection failed, retrying in 5s:", err.message);
      setTimeout(connectWithRetry, 5000); // retry after 5s
    } else {
      console.log("✅ Connected to MySQL Database");
    }
  });
};
connectWithRetry();
