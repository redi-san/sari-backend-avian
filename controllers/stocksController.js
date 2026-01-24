const Stock = require("../models/Stocks");
const User = require("../models/Users");

exports.getStocks = (req, res) => {
  Stock.getAll((err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results);
  });
};

exports.getStockBylowstock = (req, res) => {
  Stock.getBylowstock((err, results) => {
    if (err) return res.status(500).send(err);
    if (results.length === 0) return res.status(404).send("Stock not found");
    res.json(results);
  });
};

exports.createStock = (req, res) => {
  const { firebase_uid, id, barcode, name, category, stock: qty, lowstock, buying_price, selling_price, manufacturing_date, expiry_date } = req.body;

  if (!firebase_uid) {
    return res.status(400).json({ error: "firebase_uid is required" });
  }

  if (!name || !category || qty == null || buying_price == null || selling_price == null) {
    return res.status(400).json({ error: "Missing required stock fields" });
  }

  //const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
  const imagePath = req.file ? req.file.path : null;


  // ✅ FIXED: Correct function name
  User.findByUid(firebase_uid, (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error while finding user" });
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });

    const user_id = rows[0].id;

    Stock.create(
      {
        id,
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
        image: imagePath
      },
      (err2, stockId) => {
        if (err2) return res.status(500).json({ error: err2.message });

        res.json({
          id: stockId,
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
          image: imagePath,
        });
      }
    );
  });
};

exports.updateStock = (req, res) => {
  const updatedData = req.body;

  /*if (req.file) {
    updatedData.image = `/uploads/${req.file.filename}`;
  } */

    if (req.file) {
  updatedData.image = req.file.path;
}


  Stock.update(req.params.id, updatedData, (err) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true });
  });
};

exports.deleteStock = (req, res) => {
  Stock.delete(req.params.id, (err, result) => {
    if (err) return res.status(500).send(err);
    res.json({ success: true });
  });
};

exports.getStocksByUser = (req, res) => {
  const { firebase_uid } = req.params;

  const User = require("../models/Users");

  // ✅ FIXED: Correct function name
  User.findByUid(firebase_uid, (err, users) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (users.length === 0) return res.status(404).json({ error: "User not found" });

    const user_id = users[0].id;

    Stock.getByUserId(user_id, (err2, stocks) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json(stocks);
    });
  });
};
