require('dotenv').config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./config/db");
const ordersRoutes = require("./routes/orders");
const stocksRoutes = require("./routes/stocks");
const usersRoutes = require("./routes/users");
const debtsRoutes = require("./routes/debts");

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use("/orders", ordersRoutes);
app.use("/stocks", stocksRoutes);
app.use("/users", usersRoutes);
app.use("/debts", debtsRoutes);
app.use("/uploads", express.static("public/uploads"));

// Root & health routes
app.get("/", (req, res) => res.send("Backend is running 🚀"));
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

// Start server **only after DB connection succeeds**
db.connect((err) => {
  if (err) {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1); // fail fast
  } else {
    console.log("✅ Connected to MySQL Database");

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on 0.0.0.0:${PORT}`);
    });
  }
});
