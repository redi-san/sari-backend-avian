require('dotenv').config(); // <-- must be first line


const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const ordersRoutes = require("./routes/orders");
const stocksRoutes = require("./routes/stocks");
const usersRoutes = require("./routes/users");
//const homeRoutes = require("./routes/home");
const debtsRoutes = require("./routes/debts");


const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use("/orders", ordersRoutes);
app.use("/stocks", stocksRoutes);
app.use("/users", usersRoutes);
//app.use("/home", homeRoutes);
app.use("/debts", debtsRoutes);
app.use("/uploads", express.static("public/uploads"));
//app.use("/uploads_debts", express.static("public/uploads_debts"));

/*const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));*/

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on 0.0.0.0:${PORT}`);
});
