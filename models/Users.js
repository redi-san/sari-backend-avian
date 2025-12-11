const db = require("../config/db");

const Users = {
  create: (user, callback) => {
    const { firebase_uid, name, last_name, email, username, store_name, mobile_number } = user;

    const query = `
      INSERT INTO users (firebase_uid, name, last_name, email, username, store_name, mobile_number)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      query,
      [firebase_uid, name, last_name, email, username, store_name, mobile_number],
      (err, result) => {
        if (err) return callback(err, null);
        callback(null, result.insertId);
      }
    );
  },

  // ✅ Corrected casing
  findByUid: (uid, callback) => {
    db.query("SELECT * FROM users WHERE firebase_uid = ?", [uid], (err, results) => {
      if (err) return callback(err, null);
      callback(null, results);
    });
  },

  findByUsername: (username, callback) => {
    db.query("SELECT * FROM users WHERE username = ?", [username], (err, results) => {
      if (err) return callback(err, null);
      callback(null, results);
    });
  },

  updateUser: (uid, data, callback) => {
    const { name, last_name, email, username, store_name, mobile_number } = data;

    const query = `
      UPDATE users
      SET name = ?, last_name = ?, email = ?, username = ?, store_name = ?, mobile_number = ?
      WHERE firebase_uid = ?
    `;

    db.query(
      query,
      [name, last_name, email, username, store_name, mobile_number, uid],
      (err, result) => {
        if (err) return callback(err, null);
        callback(null, result);
      }
    );
  }
};

module.exports = Users;
