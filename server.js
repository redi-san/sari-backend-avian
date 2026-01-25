/*require("dotenv").config();
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

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`)); */


require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");
const cron = require("node-cron");

const ordersRoutes = require("./routes/orders");
const stocksRoutes = require("./routes/stocks");
const usersRoutes = require("./routes/users");
const debtsRoutes = require("./routes/debts");
const smsRoutes = require("./routes/sms");

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/orders", ordersRoutes);
app.use("/stocks", stocksRoutes);
app.use("/users", usersRoutes);
app.use("/debts", debtsRoutes);
app.use("/sms", smsRoutes);

// Health check
app.get("/health", (req, res) => res.status(200).send("OK"));

// ✅ Cron job: runs every day at 8:00 AM
// ✅ Cron job: runs every day at 8:00 AM
cron.schedule("0 8 * * *", async () => {
  console.log("Running debt reminder cron job...");

  try {
    const BASE_URL = process.env.APP_URL || "http://localhost:5000";
    const res = await axios.get(`${BASE_URL}/debts`);
    const debts = res.data;
    const today = new Date();

    for (const debt of debts) {
      if (!debt.due_date || debt.status === "Paid") continue;

      const dueDate = new Date(debt.due_date);
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Send reminder 7 days before due date
      if (diffDays === 7 && !debt.reminder_sent) {
        // Compute current balance (total - total_paid)
        const totalPaid = debt.total_paid || 0;
        const currentBalance = debt.total - totalPaid;

        // Build product list
        const productList = (debt.products || [])
          .map((p) => `${p.name} x${p.quantity || 0}`)
          .join(", ");

        // Get seller's name from environment variable (since cron has no auth)
        const sellerName = process.env.SELLER_NAME || "Your Seller";

        // Construct the message with line breaks
        const message = `Hi ${debt.customer_name}, this is a friendly reminder that your debt of ₱${currentBalance} is due${debt.due_date ? ` on ${debt.due_date}` : ""}.\n\n` +
                        `Products: ${productList}.\n\n` +
                        `Please settle it at your earliest convenience.\n\n` +
                        `From, ${sellerName}`;

        try {
          await axios.post(`${BASE_URL}/sms/reminder`, {
            number: debt.contact_number,
            message,
          });

          console.log(`✅ Reminder sent to ${debt.customer_name}`);

          // Mark debt as reminder sent
          await axios.put(`${BASE_URL}/debts/${debt.id}`, { reminder_sent: true });
        } catch (err) {
          console.error(`❌ Failed to send reminder to ${debt.customer_name}`, err.message);
        }
      }
    }
  } catch (err) {
    console.error("Error fetching debts for reminders:", err.message);
  }
});


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
