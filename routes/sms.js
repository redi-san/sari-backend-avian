const express = require("express");
const router = express.Router();
const axios = require("axios");

/**
 * Normalize Philippine mobile numbers to 63XXXXXXXXXX
 */
const normalizePHNumber = (num) => {
  if (!num) return null;

  let n = num.toString().replace(/\D/g, "");

  if (n.startsWith("09") && n.length === 11) n = "63" + n.slice(1);
  else if (n.startsWith("9") && n.length === 10) n = "63" + n;
  else if (n.startsWith("63") && n.length === 12) return n;
  else return null;

  return n;
};

/**
 * ==========================
 * SEND OTP (SMART-SAFE)
 * ==========================
 */
router.post("/otp", async (req, res) => {
  const { number } = req.body;

  if (!number)
    return res.status(400).json({ error: "Mobile number is required" });

  const normalizedNumber = normalizePHNumber(number);
  if (!normalizedNumber)
    return res.status(400).json({ error: "Invalid Philippine mobile number" });

  try {
    const response = await axios.post(
      "https://api.semaphore.co/api/v4/otp",
      {
        apikey: process.env.SEMAPHORE_API_KEY,
        number: normalizedNumber,
        message: "Your login code is {otp}. Do not share this code.",
      }
    );

    res.json({
      success: true,
      to: normalizedNumber,
      // ⚠️ REMOVE otp FROM RESPONSE IN PRODUCTION
      otp: response.data?.[0]?.code,
      providerResponse: response.data,
    });
  } catch (err) {
    console.error("Semaphore OTP error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: "OTP provider error",
      details: err.response?.data || null,
    });
  }
});

/**
 * ==========================
 * SEND NORMAL SMS REMINDER
 * (Use AFTER sender approval)
 * ==========================
 */
router.post("/reminder", async (req, res) => {
  const { number, message } = req.body;

  if (!number || !message)
    return res
      .status(400)
      .json({ error: "Number and message are required" });

  const normalizedNumber = normalizePHNumber(number);
  if (!normalizedNumber)
    return res.status(400).json({ error: "Invalid Philippine mobile number" });

  try {
    const response = await axios.post(
      "https://api.semaphore.co/api/v4/messages",
      {
        apikey: process.env.SEMAPHORE_API_KEY,
        number: normalizedNumber,
        message,
        sendername: "SariManage", // ✅ APPROVED SENDER NAME
      }
    );

    res.json({
      success: true,
      to: normalizedNumber,
      providerResponse: response.data,
    });
  } catch (err) {
    console.error("Semaphore SMS error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: "SMS provider error",
      details: err.response?.data || null,
    });
  }
});


/**
 * ==========================
 * GET RECENT MESSAGES
 * ==========================
 */
router.get("/messages", async (req, res) => {
  try {
    const response = await axios.get(
      "https://api.semaphore.co/api/v4/messages",
      {
        params: {
          apikey: process.env.SEMAPHORE_API_KEY,
          limit: 50,
        },
      }
    );

    res.json({
      success: true,
      messages: response.data,
    });
  } catch (err) {
    console.error("Semaphore fetch error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve messages",
      details: err.response?.data || null,
    });
  }
});

module.exports = router;
