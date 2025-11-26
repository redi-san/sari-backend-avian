const User = require("../models/Users");
const db = require("../config/db");


exports.registerUser = (req, res) => {
  const { firebase_uid, name, last_name, email, store_name, mobile_number } = req.body;

  if (!firebase_uid || !email || !mobile_number || !store_name) {
    return res.status(400).json({ error: "Required fields missing" });
  }

  User.create({ firebase_uid, name, last_name, email, store_name, mobile_number }, (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: "User already exists" });
      }
      return res.status(500).json({ error: "Failed to register user" });
    }
    res.json({ message: "User registered", userId: result });
  });
};


exports.getUser = (req, res) => {
  const { uid } = req.params;

  User.findbyUid(uid, (err, rows) => {
    if (err) return res.status(500).json({ error: "Failed to fetch user" });
    if (rows.length === 0)
      return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  });
};

exports.updateUser = (req, res) => {
  const { uid } = req.params;
  const { name, last_name, email, store_name, mobile_number } = req.body;

  const query = `
    UPDATE users 
    SET name = ?, last_name = ?, email = ?, store_name = ?, mobile_number = ? 
    WHERE firebase_uid = ?
  `;
  db.query(query, [name, last_name, email, store_name, mobile_number, uid], (err, result) => {
    if (err) return res.status(500).json({ error: "Failed to update user" });
    if (result.affectedRows === 0) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User updated successfully" });
  });
};

