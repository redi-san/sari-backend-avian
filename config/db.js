require("dotenv").config();
const mysql = require("mysql2");

// Create the MySQL connection using environment variables
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false // allow self-signed certificate from Avian
  }
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
    return;
  }
  console.log("✅ Connected to Avian MySQL");
});

module.exports = db;
