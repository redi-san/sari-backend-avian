const db = require("../config/db");

const Order = {
  // Get all orders (admin / debug use)
  getAll: (callback) => {
    db.query("SELECT * FROM orders", callback);
  },

  // Get single order by ID
  getById: (id, callback) => {
    db.query(
      "SELECT * FROM orders WHERE id = ?",
      [id],
      (err, results) => {
        if (err) return callback(err, null);
        callback(null, results[0]);
      }
    );
  },

  // Create new order ✅ with payment & change
  create: (order, callback) => {
    const {
      user_id,
      order_number,
      customer_name,
      total,
      profit,
      payment_amount,
      change_amount,
    } = order;

    const query = `
      INSERT INTO orders
      (user_id, order_number, customer_name, total, profit, payment_amount, change_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      query,
      [
        user_id,
        order_number,
        customer_name,
        total,
        profit,
        payment_amount || 0,
        change_amount || 0,
      ],
      (err, result) => {
        if (err) return callback(err, null);
        callback(null, result.insertId);
      }
    );
  },

  // Update order (used when editing)
  update: (id, order, callback) => {
    const {
      customer_name,
      total,
      profit,
      payment_amount,
      change_amount,
    } = order;

    const query = `
      UPDATE orders
      SET customer_name = ?,
          total = ?,
          profit = ?,
          payment_amount = ?,
          change_amount = ?
      WHERE id = ?
    `;

    db.query(
      query,
      [
        customer_name,
        total,
        profit,
        payment_amount || 0,
        change_amount || 0,
        id,
      ],
      callback
    );
  },

  // Delete order
  delete: (id, callback) => {
    db.query("DELETE FROM orders WHERE id = ?", [id], callback);
  },
};

module.exports = Order;
