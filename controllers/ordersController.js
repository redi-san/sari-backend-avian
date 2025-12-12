const Order = require("../models/Orders");
const OrderProduct = require("../models/OrderProduct");
const User = require("../models/Users");
const db = require("../config/db");

exports.getOrders = (req, res) => {
  const sql = `
    SELECT 
      o.id, 
      o.order_number, 
      o.customer_name, 
      o.total, 
      o.profit,
      COALESCE(
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'name', op.name,
            'quantity', op.quantity,
            'selling_price', op.selling_price,
            'buying_price', op.buying_price
          )
        ), '[]'
      ) AS products
    FROM orders o
    LEFT JOIN order_products op ON o.id = op.order_id
    GROUP BY o.id
    ORDER BY o.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error fetching orders:", err);
      return res.status(500).send(err);
    }

    results.forEach(order => {
      try {
        order.products = JSON.parse(order.products);
      } catch {
        order.products = [];
      }
    });

    res.json(results);
  });
};

exports.getOrderById = (req, res) => {
  const orderId = req.params.id;
  Order.getById(orderId, (err, order) => {
    if (err) return res.status(500).send(err);
    if (!order) return res.status(404).send("Order not found");

    OrderProduct.getByOrderId(orderId, (err2, products) => {
      if (err2) return res.status(500).send(err2);
      res.json({ ...order, products });
    });
  });
};

exports.createOrder = (req, res) => {
  const { firebase_uid, order_number, customer_name, total, profit, products } = req.body;

  if (!firebase_uid) {
    return res.status(400).json({ error: "firebase_uid is required" });
  }

  // ✅ Corrected function name
  User.findByUid(firebase_uid, (err, rows) => {
    if (err) return res.status(500).json({ error: "DB error while finding user" });
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });

    const user_id = rows[0].id;

    db.beginTransaction((err) => {
      if (err) return res.status(500).json({ error: "Failed to start transaction" });

      Order.create({ user_id, order_number, customer_name, total, profit }, (err2, orderId) => {
        if (err2) {
          return db.rollback(() => {
            res.status(500).json({ error: err2.message || "Failed to create order." });
          });
        }

        OrderProduct.bulkInsert(orderId, products, (err3) => {
          if (err3) {
            return db.rollback(() => {
              res.status(400).json({ error: err3.message || "Failed to insert products." });
            });
          }

          db.commit((err4) => {
            if (err4) {
              return db.rollback(() => {
                res.status(500).json({ error: "Failed to commit transaction" });
              });
            }

            res.json({ success: true, orderId });
          });
        });
      });
    });
  });
};

exports.deleteOrder = (req, res) => {
  const orderId = req.params.id;

  OrderProduct.deleteByOrderId(orderId, (err) => {
    if (err) return res.status(500).send(err);

    Order.delete(orderId, (err2) => {
      if (err2) return res.status(500).send(err2);
      res.json({ success: true });
    });
  });
};

exports.updateOrder = (req, res) => {
  const orderId = req.params.id;
  const { customer_name, total, profit, products } = req.body;

  db.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: "Transaction start failed" });

    db.query("SELECT name, quantity FROM order_products WHERE order_id = ?", [orderId], (err1, oldProducts) => {
      if (err1) return db.rollback(() => res.status(500).json({ error: err1.message }));

      const restoreStock = (callback) => {
        if (!oldProducts.length) return callback();

        let i = 0;
        function restoreNext() {
          if (i >= oldProducts.length) return callback();
          const p = oldProducts[i];
          db.query(
            "UPDATE stocks SET stock = stock + ? WHERE name = ?",
            [p.quantity, p.name],
            (err2) => {
              if (err2) return callback(err2);
              i++;
              restoreNext();
            }
          );
        }
        restoreNext();
      };

      restoreStock((restoreErr) => {
        if (restoreErr) return db.rollback(() => res.status(500).json({ error: restoreErr.message }));

        db.query("DELETE FROM order_products WHERE order_id = ?", [orderId], (err3) => {
          if (err3) return db.rollback(() => res.status(500).json({ error: err3.message }));

          const insertValues = products.map((p) => [
            orderId,
            p.stock_id,
            p.name,
            p.quantity,
            p.selling_price,
            p.buying_price,
          ]);

          const insertQuery = `
            INSERT INTO order_products (order_id, stock_id, name, quantity, selling_price, buying_price)
            VALUES ?
          `;

          db.query(insertQuery, [insertValues], (err4) => {
            if (err4) return db.rollback(() => res.status(500).json({ error: err4.message }));

            let j = 0;
            function deductNext() {
              if (j >= products.length) return commitAll();
              const p = products[j];
              db.query(
                "UPDATE stocks SET stock = stock - ? WHERE name = ?",
                [p.quantity, p.name],
                (err5) => {
                  if (err5) return db.rollback(() => res.status(500).json({ error: err5.message }));
                  j++;
                  deductNext();
                }
              );
            }

            function commitAll() {
              db.query(
                "UPDATE orders SET customer_name = ?, total = ?, profit = ? WHERE id = ?",
                [customer_name, total, profit, orderId],
                (err6) => {
                  if (err6) return db.rollback(() => res.status(500).json({ error: err6.message }));

                  db.commit((err7) => {
                    if (err7) return db.rollback(() => res.status(500).json({ error: err7.message }));
                    res.json({ success: true, message: "Order updated and stocks adjusted" });
                  });
                }
              );
            }

            deductNext();
          });
        });
      });
    });
  });
};

exports.getOrdersByUser = (req, res) => {
  const firebase_uid = req.params.uid;

  if (!firebase_uid) {
    return res.status(400).json({ error: "firebase_uid is required" });
  }

  const userQuery = "SELECT id FROM users WHERE firebase_uid = ?";
  db.query(userQuery, [firebase_uid], (err, userResult) => {
    if (err) return res.status(500).json({ error: "DB error while finding user" });
    if (userResult.length === 0) return res.status(404).json({ error: "User not found" });

    const user_id = userResult[0].id;

    const sql = `
      SELECT 
        o.id, 
        o.order_number, 
        o.customer_name, 
        o.total, 
        o.profit,
        COALESCE(
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'name', op.name,
              'quantity', op.quantity,
              'selling_price', op.selling_price,
              'buying_price', op.buying_price
            )
          ), '[]'
        ) AS products
      FROM orders o
      LEFT JOIN order_products op ON o.id = op.order_id
      WHERE o.user_id = ?
      GROUP BY o.id
      ORDER BY o.id DESC
    `;

    db.query(sql, [user_id], (err2, results) => {
      if (err2) return res.status(500).json({ error: "Error fetching user orders" });

      results.forEach(order => {
        try {
          order.products = JSON.parse(order.products);
        } catch {
          order.products = [];
        }
      });

      res.json(results);
    });
  });
};
