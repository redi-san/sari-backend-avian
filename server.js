require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const ordersRoutes = require("./routes/orders");
const stocksRoutes = require("./routes/stocks");
const usersRoutes = require("./routes/users");
const debtsRoutes = require("./routes/debts");
const smsRoutes = require("./routes/sms"); // ✅ IMPORT ONLY

const app = express(); // ✅ app created here

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/orders", ordersRoutes);
app.use("/stocks", stocksRoutes);
app.use("/users", usersRoutes);
app.use("/debts", debtsRoutes);
app.use("/sms", smsRoutes); // ✅ REGISTER HERE

// Serve uploaded files
//app.use("/uploads", express.static("public/uploads"));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
