const Debt = require("../models/Debts");
const DebtProduct = require("../models/DebtProduct");
const User = require("../models/Users");
const db = require("../config/db");

// GET all debts
exports.getDebt = (req, res) => {
  const sql = `
    SELECT 
      d.id, 
      d.customer_name,
      d.contact_number,
      d.date,
      d.due_date,
      d.note,
      d.status,
      d.total,
      d.profit,
      d.total_paid,
      COALESCE(
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', dp.id,
            'stock_id', dp.stock_id,
            'name', dp.name,
            'quantity', dp.quantity,
            'selling_price', dp.selling_price,
            'buying_price', dp.buying_price,
            'dateAdded', dp.date_added
          )
        ), '[]'
      ) AS products
    FROM debts d
    LEFT JOIN debt_products dp ON d.id = dp.debt_id
    GROUP BY d.id
    ORDER BY d.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching debts:", err);
      return res.status(500).send(err);
    }

    results.forEach((debt) => {
      try {
        debt.products = JSON.parse(debt.products);
      } catch {
        debt.products = [];
      }

      if (debt.date)
        debt.date = new Date(debt.date).toLocaleDateString("en-CA");
      if (debt.due_date)
        debt.due_date = new Date(debt.due_date).toLocaleDateString("en-CA");
    });

    res.json(results);
  });
};

// CREATE a new debt
exports.createDebt = (req, res) => {
  const {
    user_id: firebase_uid,
    customer_name,
    contact_number,
    date,
    due_date,
    note,
    status,
    total,
    profit,
    products,
  } = req.body;

  if (!firebase_uid) {
    return res.status(400).json({ error: "firebase_uid is required" });
  }

  const finalStatus = status && status.trim() !== "" ? status : "Unpaid";

  User.findByUid(firebase_uid, (err, rows) => {
    if (err)
      return res.status(500).json({ error: "DB error while finding user" });
    if (rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    const user_id = rows[0].id;

    db.beginTransaction((err) => {
      if (err)
        return res.status(500).json({ error: "Failed to start transaction" });

      Debt.create(
        {
          user_id,
          customer_name,
          contact_number,
          date,
          due_date: due_date && due_date.trim() !== "" ? due_date : null,
          note,
          status: finalStatus,
          total,
          profit,
        },
        (err2, debtId) => {
          if (err2) {
            return db.rollback(() => {
              res
                .status(500)
                .json({ error: err2.message || "Failed to create debt." });
            });
          }

          DebtProduct.bulkInsert(debtId, products, (err3) => {
            if (err3) {
              return db.rollback(() => {
                res.status(400).json({
                  error: err3.message || "Failed to insert products.",
                });
              });
            }

            db.commit((err4) => {
              if (err4) {
                return db.rollback(() => {
                  res
                    .status(500)
                    .json({ error: "Failed to commit transaction" });
                });
              }
              res.json({ success: true, debtId });
            });
          });
        }
      );
    });
  });
};

// ADD products to an existing debt
exports.addDebtProducts = (req, res) => {
  const { debtId } = req.params;
  const { products, total, profit } = req.body;

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: "No products provided" });
  }

  DebtProduct.bulkInsert(debtId, products, (err) => {
    if (err) return res.status(400).json({ error: err.message });

    const updateQuery = `
      UPDATE debts 
      SET total = total + ?, profit = profit + ? 
      WHERE id = ?
    `;
    db.query(updateQuery, [total, profit, debtId], (updateErr) => {
      if (updateErr)
        return res.status(500).json({ error: "Failed to update debt totals" });

      res.json({ message: "Products successfully added to debt" });
    });
  });
};

// UPDATE debt status (e.g., mark as paid)
exports.updateStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (status !== "Paid") {
    return res.status(400).json({ error: "Invalid status value" });
  }

  Debt.updateStatus(id, status, (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Debt not found" });

    res.json({ message: `Debt marked as ${status}` });
  });
};

// DELETE debt
exports.deleteDebt = (req, res) => {
  const debtId = req.params.id;

  DebtProduct.deleteByDebtId(debtId, (err) => {
    if (err) return res.status(500).send(err);

    Debt.delete(debtId, (err2) => {
      if (err2) return res.status(500).send(err2);
      res.json({ success: true });
    });
  });
};

// UPDATE debt and its products
exports.updateDebt = (req, res) => {
  const { id } = req.params;
  const {
    customer_name,
    contact_number,
    date,
    due_date,
    note,
    status,
    total,
    profit,
    products,
  } = req.body;

  const updateDebtQuery = `
    UPDATE debts
    SET customer_name = ?, contact_number = ?, date = ?, due_date = ?, note = ?, status = ?, total = ?, profit = ?
    WHERE id = ?
  `;

  db.query(
    updateDebtQuery,
    [
      customer_name,
      contact_number,
      date,
      due_date && due_date.trim() !== "" ? due_date : null,
      note,
      status,
      total,
      profit,
      id,
    ],
    (err) => {
      if (err)
        return res.status(500).json({ error: "Failed to update debt info" });

      db.query(
        "SELECT stock_id, quantity FROM debt_products WHERE debt_id = ?",
        [id],
        (selErr, oldProducts) => {
          if (selErr)
            return res.status(500).json({ error: "Failed to fetch old products" });

          const restoreTasks = oldProducts
            .filter((p) => p.stock_id)
            .map(
              (p) =>
                new Promise((resolve, reject) => {
                  db.query(
                    "UPDATE stocks SET stock = stock + ? WHERE id = ?",
                    [p.quantity, p.stock_id],
                    (err2) => (err2 ? reject(err2) : resolve())
                  );
                })
            );

          Promise.all(restoreTasks)
            .then(() => {
              db.query(
                "DELETE FROM debt_products WHERE debt_id = ?",
                [id],
                (delErr) => {
                  if (delErr)
                    return res.status(500).json({
                      error: "Failed to reset old products",
                    });

                  if (!products || products.length === 0)
                    return res.json({
                      message: "Debt updated successfully (no products)",
                    });

                  const insertValues = products.map((p) => [
                    id,
                    p.stock_id || null,
                    p.name,
                    p.quantity,
                    p.selling_price,
                    p.buying_price,
                    p.dateAdded || new Date().toLocaleDateString("en-CA"),
                  ]);

                  const insertQuery = `
                    INSERT INTO debt_products 
                    (debt_id, stock_id, name, quantity, selling_price, buying_price, date_added)
                    VALUES ?
                  `;

                  db.query(insertQuery, [insertValues], (insertErr) => {
                    if (insertErr)
                      return res.status(500).json({
                        error:
                          insertErr.sqlMessage ||
                          "Failed to insert updated products",
                      });

                    const deductTasks = products
                      .filter((p) => p.stock_id)
                      .map(
                        (p) =>
                          new Promise((resolve, reject) => {
                            db.query(
                              "UPDATE stocks SET stock = stock - ? WHERE id = ?",
                              [p.quantity, p.stock_id],
                              (err3) => (err3 ? reject(err3) : resolve())
                            );
                          })
                      );

                    Promise.all(deductTasks)
                      .then(() => {
                        res.json({
                          message:
                            "Debt and stock levels updated successfully",
                        });
                      })
                      .catch(() =>
                        res.status(500).json({
                          error: "Failed to adjust stock levels",
                        })
                      );
                  });
                }
              );
            })
            .catch(() =>
              res.status(500).json({ error: "Failed to restore stock levels" })
            );
        }
      );
    }
  );
};

// GET debts by user
exports.getDebtsByUser = (req, res) => {
  const firebase_uid = req.params.uid;

  if (!firebase_uid) {
    return res.status(400).json({ error: "Firebase UID is required" });
  }

  const userQuery = "SELECT id FROM users WHERE firebase_uid = ?";
  db.query(userQuery, [firebase_uid], (err, userRows) => {
    if (err)
      return res.status(500).json({ error: "DB error while fetching user" });
    if (userRows.length === 0)
      return res.status(404).json({ error: "User not found" });

    const user_id = userRows[0].id;

    const sql = `
      SELECT 
        d.id, d.customer_name, d.contact_number, d.date, d.due_date,
        d.note, d.status, d.total, d.profit, d.total_paid,
        COALESCE(
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', dp.id,
              'stock_id', dp.stock_id,
              'name', dp.name,
              'quantity', dp.quantity,
              'selling_price', dp.selling_price,
              'buying_price', dp.buying_price,
              'dateAdded', dp.date_added
            )
          ), '[]'
        ) AS products
      FROM debts d
      LEFT JOIN debt_products dp ON d.id = dp.debt_id
      WHERE d.user_id = ?
      GROUP BY d.id
      ORDER BY d.id DESC
    `;

    db.query(sql, [user_id], (err2, results) => {
      if (err2) return res.status(500).json({ error: "Error fetching debts" });

      results.forEach((debt) => {
        try {
          debt.products = JSON.parse(debt.products);
        } catch {
          debt.products = [];
        }
        if (debt.date) debt.date = new Date(debt.date).toLocaleDateString("en-CA");
        if (debt.due_date) debt.due_date = new Date(debt.due_date).toLocaleDateString("en-CA");
      });

      res.json(results);
    });
  });
};

// ADD payment to debt
exports.addPayment = (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid payment amount" });
  }

  const insertPayment = `
    INSERT INTO debt_payments (debt_id, amount) VALUES (?, ?)
  `;

  db.query(insertPayment, [id, amount], (err) => {
    if (err) return res.status(500).json({ error: "Failed to record payment" });

    const updateDebtStatus = `
      UPDATE debts d
      JOIN (
        SELECT debt_id, SUM(amount) AS total_paid 
        FROM debt_payments 
        WHERE debt_id = ? 
        GROUP BY debt_id
      ) p ON d.id = p.debt_id
      SET 
        d.total_paid = p.total_paid,
        d.status = CASE 
          WHEN p.total_paid >= d.total THEN 'Paid'
          ELSE d.status
        END
      WHERE d.id = ?;
    `;

    db.query(updateDebtStatus, [id, id], (err2) => {
      if (err2) return res.status(500).json({ error: "Failed to update debt status" });

      res.json({ message: "Payment recorded successfully!" });
    });
  });
};
