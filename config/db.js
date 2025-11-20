require("dotenv").config(); // Load environment variables
const mysql = require("mysql2");

// Create the MySQL connection using environment variables
const db = mysql.createConnection({
  host: process.env.DB_HOST,       // e.g., ballast.proxy.rlwy.net
  port: process.env.DB_PORT,       // e.g., 22427
  user: process.env.DB_USER,       // e.g., root
  password: process.env.DB_PASS,   // your Railway password
  database: process.env.DB_NAME    // e.g., railway
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
    return;
  }
  console.log("✅ Connected to Railway MySQL");
});

module.exports = db;
