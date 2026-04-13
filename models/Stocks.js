const db = require("../config/db");

const Stock = {
  getAll: (callback) => {
    db.query("SELECT * FROM stocks", callback);
  },

  getBylowstock: (callback) => {
    db.query("SELECT * FROM stocks WHERE stock <= lowstock", (err, results) => {
      if (err) return callback(err, null);
      callback(null, results);
    });
  },

  getByUserId: (user_id, callback) => {
    db.query("SELECT * FROM stocks WHERE user_id = ?", [user_id], callback);
  },

  create: (stock, callback) => {
    const {
      user_id,
      barcode,
      name,
      category,
      stock: qty,
      lowstock,
      buying_price,
      selling_price,
      manufacturing_date,
      expiry_date,
      image,
    } = stock;
    const query = `
      INSERT INTO stocks 
      (user_id, barcode, name, category, stock, lowstock, buying_price, selling_price,  manufacturing_date, expiry_date, image) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(
      query,
      [
        user_id,
        barcode,
        name,
        category,
        qty,
        lowstock,
        buying_price,
        selling_price,
        manufacturing_date,
        expiry_date,
        image,
      ],
      (err, result) => {
        if (err) return callback(err, null);
        callback(null, result.insertId);
      },
    );
  },

  deleteByCategory: (user_id, category, callback) => {
    db.query(
      "DELETE FROM stocks WHERE user_id = ? AND category = ?",
      [user_id, category],
      callback,
    );
  },

  update: (id, stock, callback) => {
    const allowed = [
      "name",
      "barcode",
      "category",
      "stock",
      "lowstock",
      "buying_price",
      "selling_price",
      "manufacturing_date",
      "expiry_date",
      "image",
    ];

    const fields = [];
    const params = [];

    for (const key of allowed) {
      if (stock[key] !== undefined) {
        fields.push(`${key}=?`);
        params.push(stock[key]);
      }
    }

    if (fields.length === 0) {
      return callback(null); 
    }

    const query = `UPDATE stocks SET ${fields.join(", ")} WHERE id=?`;
    params.push(id);

    db.query(query, params, callback);
  },

  delete: (id, callback) => {
    db.query("DELETE FROM stocks WHERE id = ?", [id], callback);
  },
};

module.exports = Stock;
