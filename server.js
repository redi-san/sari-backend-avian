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

// --- Move your debt reminder code into a function ---
async function sendDebtReminders() {
  console.log("Running debt reminder job...");

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

      if (diffDays === 7 && !debt.reminder_sent) {
        const totalPaid = debt.total_paid || 0;
        const currentBalance = debt.total - totalPaid;
        const productList = (debt.products || [])
          .map((p) => `${p.name} x${p.quantity || 0}`)
          .join(", ");
        const sellerName = process.env.SELLER_NAME || "Your Seller";

        const message = `Hi ${debt.customer_name}, this is a friendly reminder that your debt of ₱${currentBalance} is due${debt.due_date ? ` on ${debt.due_date}` : ""}.\n\n` +
                        `Products: ${productList}.\n\n` +
                        `Please settle it at your earliest convenience.\n\n` +
                        `From, ${sellerName}`;

        try {
          await axios.post(`${BASE_URL}/sms/reminder`, { number: debt.contact_number, message });
          console.log(`✅ Reminder sent to ${debt.customer_name}`);
          await axios.put(`${BASE_URL}/debts/${debt.id}`, { reminder_sent: true });
        } catch (err) {
          console.error(`❌ Failed to send reminder to ${debt.customer_name}`, err.message);
        }
      }
    }
  } catch (err) {
    console.error("Error fetching debts:", err.message);
  }
}

// --- Run immediately on server start ---
//sendDebtReminders();

// --- Schedule daily cron at 07:55 ---
cron.schedule("30 1 * * *", sendDebtReminders);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
